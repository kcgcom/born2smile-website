/**
 * Server-side Supabase helper for blog posts.
 * Uses Supabase Admin (service_role) — server components and API routes only.
 *
 * Provides cached read helpers and uncached write helpers for blog posts.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabase-admin";
import type { BlogBlock, BlogPost, BlogPostMeta } from "./blog/types";
import type { BlogCategorySlug, BlogCategoryValue } from "./blog/types";
import { normalizeBlogCategory } from "./blog";
import { getCategoryLabel } from "./blog/category-slugs";
import { getTodayKST } from "./date";
import { BLOG_POSTS_SNAPSHOT, type BlogSnapshotPost } from "./blog/generated/posts-snapshot";

const TABLE = "blog_posts";
const POST_META_COLUMNS = "slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time";
const CACHE_TAG = "blog-posts";
const CACHE_TTL = 3600; // 1 hour
const DEPLOY_CACHE_SEGMENT = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
const PUBLIC_POSTS_CACHE_KEY = `blog-posts-published-full-${DEPLOY_CACHE_SEGMENT}`;
const PUBLIC_BLOG_DATA_SOURCE = process.env.BLOG_PUBLIC_DATA_SOURCE;
// 빌드 명령에만 이 값을 주입한다. 배포된 Serverless 런타임에는 값이 없으므로
// ISR과 관리자 수정 후 재검증은 계속 Supabase 최신 데이터를 우선 조회한다.
const FORCE_PUBLIC_SNAPSHOT = PUBLIC_BLOG_DATA_SOURCE === "snapshot";
const PUBLIC_QUERY_CACHE_SEGMENT = `${DEPLOY_CACHE_SEGMENT}-${FORCE_PUBLIC_SNAPSHOT ? "snapshot" : "live"}`;

function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag, "max");
  } catch (error) {
    console.warn(`[blog-supabase] failed to revalidate tag '${tag}'`, error);
  }
}

function getBlogPostCacheTag(slug: string): string {
  return `blog-post-${slug}`;
}

export function expireBlogPostCache(slug: string): void {
  revalidateTag(getBlogPostCacheTag(slug), { expire: 0 });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isBlogBlockArray(value: unknown): value is BlogBlock[] {
  return Array.isArray(value) && value.every((item) => (
    item &&
    typeof item === "object" &&
    "type" in item &&
    typeof item.type === "string"
  ));
}

function calculateReadTimeFromBlocks(blocks: BlogBlock[]): string {
  const totalChars = blocks.reduce((sum, block) => {
    switch (block.type) {
      case "heading":
      case "paragraph":
        return sum + block.text.length;
      case "image":
        return block.hidden ? sum : sum + (block.caption?.length ?? 0);
      case "list":
        return sum + block.items.reduce((acc, item) => acc + item.length, 0);
      case "faq":
        return sum + block.question.length + block.answer.length;
      case "relatedLinks":
        return sum + block.items.reduce(
          (acc, item) => acc + item.title.length + item.href.length + (item.description?.length ?? 0),
          0,
        );
      case "table":
        return sum + block.headers.reduce((acc, item) => acc + item.length, 0)
          + block.rows.reduce(
            (rowAcc, row) => rowAcc + row.reduce((cellAcc, cell) => cellAcc + cell.length, 0),
            0,
          );
      case "researchCallout":
        return sum + block.title.length + block.description.length + block.href.length + block.linkText.length;
      default:
        return sum;
    }
  }, 0);
  return `${Math.max(1, Math.ceil(totalChars / 500))}분`;
}

function calculateReadTime(data: Pick<BlogPost, "blocks">): string {
  return calculateReadTimeFromBlocks(data.blocks);
}

// --- DB row <-> TypeScript object mapping ---

interface DbRow {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  date_modified: string | null;
  content: unknown[];
  read_time: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

function normalizeCategoryOrThrow(category: string): BlogCategorySlug {
  const normalized = normalizeBlogCategory(category);
  if (!normalized) {
    throw new Error(`[blog-supabase] Unknown category: ${category}`);
  }
  return normalized;
}

type PostMetaRow = Pick<DbRow,
  "slug" | "title" | "subtitle" | "excerpt" | "category" | "tags" | "date" | "date_modified" | "read_time"
>;

function rowToMeta(row: PostMetaRow): BlogPostMeta {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: normalizeCategoryOrThrow(row.category),
    tags: row.tags ?? [],
    date: row.date,
    dateModified: row.date_modified ?? undefined,
    readTime: row.read_time ?? "1분",
  };
}

function rowToPost(row: PostMetaRow & Pick<DbRow, "content">): BlogPost {
  return {
    ...rowToMeta(row),
    blocks: isBlogBlockArray(row.content) ? row.content : [],
  };
}

// ---------------------------------------------------------------------------
// Snapshot fallback helpers (used when Supabase is unreachable)
// ---------------------------------------------------------------------------

function snapshotToMeta(post: BlogSnapshotPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    category: normalizeCategoryOrThrow(post.category),
    tags: post.tags,
    date: post.date,
    dateModified: post.dateModified,
    readTime: post.readTime ?? calculateReadTimeFromBlocks(isBlogBlockArray(post.blocks) ? post.blocks : []),
  };
}

function snapshotToPost(post: BlogSnapshotPost): BlogPost {
  return { ...snapshotToMeta(post), blocks: isBlogBlockArray(post.blocks) ? post.blocks : [] };
}

function getSnapshotPosts(): (BlogPost & { published: boolean })[] {
  return BLOG_POSTS_SNAPSHOT.map(post => ({ ...snapshotToPost(post), published: post.published }));
}

function getSnapshotPublishedPosts(): BlogPost[] {
  const today = getTodayKST();
  return getSnapshotPosts()
    .filter((post) => post.published && post.date <= today)
    .map((post) => {
      const { published: _published, ...rest } = post;
      void _published;
      return rest;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getSnapshotPost(slug: string, publicThrough?: string): BlogPost | null {
  const post = BLOG_POSTS_SNAPSHOT.find(entry => entry.slug === slug);
  if (!post || (publicThrough !== undefined && (!post.published || post.date > publicThrough))) return null;
  return snapshotToPost(post);
}

// ---------------------------------------------------------------------------
// Read functions (cached)
// ---------------------------------------------------------------------------

/** 관리자 분석·검증 작업용 전체 게시글 직접 조회. Next.js 캐시 컨텍스트 밖에서도 사용할 수 있다. */
export async function getAllPublishedPostsUncached(
  scope?: { category: BlogCategorySlug; slug?: string },
): Promise<BlogPost[]> {
  const fallback = () => getSnapshotPublishedPosts().filter((post) =>
    !scope || (post.category === scope.category && (scope.slug === undefined || post.slug === scope.slug)),
  );
  if (!isSupabaseAdminConfigured) return fallback();
  try {
    const today = getTodayKST();
    let query = getSupabaseAdmin()
      .from(TABLE)
      .select(`${POST_META_COLUMNS}, content`)
      .eq("published", true)
      .lte("date", today)
      .order("date", { ascending: false });
    if (scope) query = query.in("category", [scope.category, getCategoryLabel(scope.category)]);
    if (scope?.slug !== undefined) query = query.eq("slug", scope.slug);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(rowToPost);
  } catch (error) {
    console.warn("[blog-supabase] Direct query failed, using snapshot fallback", error);
    return fallback();
  }
}

/**
 * All published posts visible to site visitors (date <= today KST), including full blocks.
 * Ordered by date DESC.
 * Falls back to snapshot data if Supabase query fails.
 */
export const getAllPublishedPosts: () => Promise<BlogPost[]> =
  unstable_cache(
    async (): Promise<BlogPost[]> => {
      if (FORCE_PUBLIC_SNAPSHOT) return getSnapshotPublishedPosts();
      return getAllPublishedPostsUncached();
    },
    [PUBLIC_POSTS_CACHE_KEY],
    { revalidate: CACHE_TTL, tags: [CACHE_TAG] },
  );

/**
 * All published posts visible to site visitors (date <= today KST).
 * Ordered by date DESC.
 * Falls back to snapshot data if Supabase query fails.
 */
const getPublishedPostMetasForDate = unstable_cache(
  async (today: string): Promise<BlogPostMeta[]> => {
    if (!FORCE_PUBLIC_SNAPSHOT && isSupabaseAdminConfigured) {
      try {
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select(POST_META_COLUMNS)
          .eq("published", true)
          .lte("date", today)
          .order("date", { ascending: false });

        if (error) throw error;
        return data.map(rowToMeta);
      } catch (error) {
        console.warn("[blog-supabase] Metadata query failed, using snapshot fallback", error);
      }
    }
    return BLOG_POSTS_SNAPSHOT
      .filter(post => post.published && post.date <= today)
      .map(snapshotToMeta)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  [`blog-posts-published-${PUBLIC_QUERY_CACHE_SEGMENT}`],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG] },
);

export function getAllPublishedPostMetas(): Promise<BlogPostMeta[]> {
  return getPublishedPostMetasForDate(getTodayKST());
}

export async function getAllPostMetasFresh(): Promise<
  (BlogPostMeta & { published: boolean; createdAt?: string })[]
> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select(`${POST_META_COLUMNS}, published, created_at`)
    .order("date", { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    ...rowToMeta(row),
    published: row.published ?? true,
    createdAt: row.created_at ?? undefined,
  }));
}

/**
 * Single post by slug, including full content.
 * Returns null when not found.
 * Falls back to snapshot data if Supabase fails.
 */
export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const today = getTodayKST();
  if (FORCE_PUBLIC_SNAPSHOT || !isSupabaseAdminConfigured) {
    return getSnapshotPost(slug, today);
  }

  try {
    const post = await unstable_cache(
      async (): Promise<BlogPost | null> => {
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select(`${POST_META_COLUMNS}, content`)
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        if (error) throw error;
        return data ? rowToPost(data) : null;
      },
      [`${getBlogPostCacheTag(slug)}-single-${PUBLIC_QUERY_CACHE_SEGMENT}`],
      { revalidate: CACHE_TTL, tags: [getBlogPostCacheTag(slug)] },
    )();
    // Apply the publication date after reading the server cache, including on a cache hit.
    return post && post.date <= today ? post : null;
  } catch (error) {
    console.warn("[blog-supabase] Public post query failed, using snapshot fallback", error);
    return getSnapshotPost(slug, today);
  }
});

/**
 * Fetch a single post by slug without any caching — always fresh from Supabase.
 * Use this for admin preview pages where stale data is unacceptable.
 */
export async function getPostBySlugFresh(slug: string): Promise<BlogPost | null> {
  if (!isSupabaseAdminConfigured) return getSnapshotPost(slug);
  try {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return getSnapshotPost(slug);
      throw error;
    }

    return rowToPost(data as DbRow);
  } catch {
    console.warn(`[blog-supabase] Supabase read failed for ${slug}, using snapshot fallback`);
    return getSnapshotPost(slug);
  }
}

/**
 * Fetch a single post for admin editing without caching.
 * Includes non-public fields such as published state and createdAt.
 */
export async function getPostAdminBySlugFresh(slug: string): Promise<BlogPostAdminRecord | null> {
  const snapshotFallback = () => {
    const post = getSnapshotPosts().find((entry) => entry.slug === slug);
    if (!post) return null;
    return {
      ...post,
      createdAt: undefined,
    };
  };

  if (!isSupabaseAdminConfigured) return snapshotFallback();

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      if (error.code === "PGRST116") return snapshotFallback();
      throw error;
    }

    const row = data as DbRow;
    return {
      ...rowToPost(row),
      published: row.published ?? true,
      createdAt: row.created_at ?? undefined,
    };
  } catch (error) {
    console.warn(`[blog-supabase] Supabase admin read failed for ${slug}, using snapshot fallback`, error);
    return snapshotFallback();
  }
}

/**
 * Related posts for a given category, excluding a specific slug.
 * Only published posts with date <= today KST.
 * Falls back to snapshot data if Supabase query fails.
 */
export async function getRelatedPosts(
  category: BlogCategoryValue,
  excludeSlug: string,
  limit = 3,
): Promise<BlogPostMeta[]> {
  const posts = await getAllPublishedPostMetas();
  return posts.filter(post => post.category === category && post.slug !== excludeSlug).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Write functions (no cache — call revalidateTag after mutation)
// ---------------------------------------------------------------------------

export type CreateBlogPostData = Omit<BlogPost, "readTime"> & {
  readTime?: string;
  published?: boolean;
};

/**
 * Create a new blog post row.
 * Calculates readTime from blocks automatically.
 */
export async function createBlogPost(
  data: CreateBlogPostData,
  updatedBy: string,
): Promise<void> {
  const now = new Date().toISOString();
  const readTime = calculateReadTime(data);

  const row = {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    category: data.category,
    tags: data.tags,
    date: data.date,
    date_modified: data.dateModified ?? null,
    content: data.blocks,
    read_time: readTime,
    published: data.published ?? false,
    created_at: now,
    updated_at: now,
    updated_by: updatedBy,
  };

  const { error } = await getSupabaseAdmin().from(TABLE).insert(row);
  if (error) throw error;

  safeRevalidateTag(CACHE_TAG);
}

export type UpdateBlogPostData = Partial<
  Omit<BlogPost, "slug" | "readTime" | "dateModified"> & { published: boolean }
> & {
  dateModified?: string | null;
};

export type BlogPostAdminRecord = BlogPost & {
  published: boolean;
  createdAt?: string;
};

/**
 * All posts with full block content for admin analysis.
 * Use sparingly for internal tooling where metadata-only reads are insufficient.
 */
export async function getAllPostDetailsFresh(): Promise<BlogPostAdminRecord[]> {
  const snapshotFallback = () =>
    getSnapshotPosts().map((post) => ({
      ...post,
      createdAt: undefined,
    }));

  if (!isSupabaseAdminConfigured) return snapshotFallback();

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    return (data as DbRow[]).map((row) => ({
      ...rowToPost(row),
      published: row.published ?? true,
      createdAt: row.created_at ?? undefined,
    }));
  } catch (error) {
    console.warn("[blog-supabase] Supabase full-post query failed, using snapshot fallback", error);
    return snapshotFallback();
  }
}

/**
 * Update an existing blog post row (partial update).
 * Recalculates readTime if blocks are provided.
 */
export class DraftPublicationConflictError extends Error {}

export async function updateBlogPost(
  slug: string,
  data: UpdateBlogPostData,
  updatedBy: string,
  privateState?: { published: boolean; date: string },
  draftOnly = false,
): Promise<boolean> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  if (data.title !== undefined) update.title = data.title;
  if (data.subtitle !== undefined) update.subtitle = data.subtitle;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.category !== undefined) update.category = data.category;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.date !== undefined) update.date = data.date;
  if ("dateModified" in data) update.date_modified = data.dateModified ?? null;
  if (data.published !== undefined) update.published = data.published;

  if (data.blocks !== undefined) {
    update.content = data.blocks;
    update.read_time = calculateReadTime({ blocks: data.blocks });
  }

  const admin = getSupabaseAdmin();
  if (draftOnly) {
    const { data: saved, error } = await admin.from(TABLE)
      .update(update)
      .eq("slug", slug)
      .eq("published", false)
      .select("slug")
      .maybeSingle();
    if (error) throw error;
    if (!saved) throw new DraftPublicationConflictError();
    expireBlogPostCache(slug);
    return false;
  }
  if (privateState) {
    // A concurrent publication must go through the normal invalidation path.
    const { data: saved, error } = await admin.from(TABLE)
      .update(update)
      .eq("slug", slug)
      .eq("published", privateState.published)
      .eq("date", privateState.date)
      .select("published, date")
      .maybeSingle();
    if (error) throw error;
    if (saved) {
      expireBlogPostCache(slug);
      const today = getTodayKST();
      if (!(privateState.published && privateState.date <= today) && !(saved.published && saved.date <= today)) {
        return false;
      }
      safeRevalidateTag(CACHE_TAG);
      return true;
    }
  }

  const { error } = await admin
    .from(TABLE)
    .update(update)
    .eq("slug", slug);

  if (error) throw error;

  expireBlogPostCache(slug);
  safeRevalidateTag(CACHE_TAG);
  return true;
}

/**
 * Delete a blog post row by slug.
 */
export async function deleteBlogPost(slug: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .delete()
    .eq("slug", slug);

  if (error) throw error;

  expireBlogPostCache(slug);
  safeRevalidateTag(CACHE_TAG);
}
