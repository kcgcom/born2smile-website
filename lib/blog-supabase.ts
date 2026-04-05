/**
 * Server-side Supabase helper for blog posts.
 * Uses Supabase Admin (service_role) — server components and API routes only.
 *
 * Provides cached read helpers and uncached write helpers for blog posts.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabase-admin";
import type { BlogBlock, BlogPost, BlogPostMeta } from "./blog/types";
import type { BlogCategorySlug, BlogCategoryValue } from "./blog/types";
import { getCategorySlug, normalizeBlogCategory } from "./blog";
import { getTodayKST } from "./date";
import { BLOG_POSTS_SNAPSHOT } from "./blog/generated/posts-snapshot";

const TABLE = "blog_posts";
const CACHE_TAG = "blog-posts";
const CACHE_TTL = 3600; // 1 hour

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

function getRelatedPostsCacheKey(
  category: BlogCategoryValue,
  excludeSlug: string,
  limit: number,
): string {
  return `blog-related-${getCategorySlug(category)}-${excludeSlug}-${limit}`;
}

function getRelatedPostsCacheTag(category: BlogCategoryValue): string {
  return `blog-related-${getCategorySlug(category)}`;
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
      case "list":
        return sum + block.items.reduce((acc, item) => acc + item.length, 0);
      case "faq":
        return sum + block.question.length + block.answer.length;
      case "relatedLinks":
        return sum + block.items.reduce(
          (acc, item) => acc + item.title.length + item.href.length + (item.description?.length ?? 0),
          0,
        );
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
  reviewed_date: string | null;
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

function rowToMeta(
  row: DbRow,
): BlogPostMeta & { published: boolean; createdAt?: string } {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: normalizeCategoryOrThrow(row.category),
    tags: (row.tags ?? []) as BlogPostMeta["tags"],
    date: row.date,
    dateModified: row.date_modified ?? undefined,
    readTime: row.read_time ?? "1분",
    published: row.published ?? true,
    createdAt: row.created_at ?? undefined,
  };
}

function rowToPost(row: DbRow): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: normalizeCategoryOrThrow(row.category),
    tags: (row.tags ?? []) as BlogPostMeta["tags"],
    date: row.date,
    dateModified: row.date_modified ?? undefined,
    blocks: isBlogBlockArray(row.content) ? row.content : [],
    readTime: row.read_time ?? "1분",
    reviewedDate: row.reviewed_date ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Snapshot fallback helpers (used when Supabase is unreachable)
// ---------------------------------------------------------------------------

function getSnapshotPosts(): (BlogPost & { published: boolean })[] {
  return BLOG_POSTS_SNAPSHOT.map((post) => ({
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    category: normalizeCategoryOrThrow(post.category),
    tags: post.tags as BlogPost["tags"],
    date: post.date,
    dateModified: post.dateModified,
    blocks: isBlogBlockArray(post.blocks) ? post.blocks : [],
    readTime: post.readTime,
    reviewedDate: post.reviewedDate,
    published: post.published,
  }));
}

function getSnapshotPublishedMetas(): BlogPostMeta[] {
  const today = getTodayKST();
  return getSnapshotPosts()
    .filter((post) => post.published && post.date <= today)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      date: post.date,
      dateModified: post.dateModified,
      readTime: post.readTime ?? calculateReadTime(post),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getSnapshotPost(slug: string): BlogPost | null {
  const post = getSnapshotPosts().find((entry) => entry.slug === slug);
  if (!post) return null;
  const { published: _published, ...rest } = post;
  void _published;
  return rest;
}

// ---------------------------------------------------------------------------
// Read functions (cached)
// ---------------------------------------------------------------------------

/**
 * All published posts visible to site visitors (date <= today KST).
 * Ordered by date DESC.
 * Falls back to snapshot data if Supabase query fails.
 */
export const getAllPublishedPostMetas: () => Promise<BlogPostMeta[]> =
  unstable_cache(
    async (): Promise<BlogPostMeta[]> => {
      if (!isSupabaseAdminConfigured) return getSnapshotPublishedMetas();
      try {
        const today = getTodayKST();
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time, published, created_at")
          .eq("published", true)
          .lte("date", today)
          .order("date", { ascending: false });

        if (error) throw error;

        return (data as DbRow[]).map((row) => {
          const meta = rowToMeta(row);
          return {
            slug: meta.slug,
            title: meta.title,
            subtitle: meta.subtitle,
            excerpt: meta.excerpt,
            category: meta.category,
            tags: meta.tags,
            date: meta.date,
            dateModified: meta.dateModified,
            readTime: meta.readTime,
          };
        });
      } catch (e) {
        console.warn("[blog-supabase] Supabase query failed, using snapshot fallback", e);
        return getSnapshotPublishedMetas();
      }
    },
    ["blog-posts-published"],
    { revalidate: CACHE_TTL, tags: [CACHE_TAG] },
  );

/**
 * All posts regardless of published status or date.
 * For admin dashboard use only. Ordered by date DESC.
 */
export const getAllPostMetas: () => Promise<
  (BlogPostMeta & { published: boolean; createdAt?: string })[]
> = unstable_cache(
  async (): Promise<(BlogPostMeta & { published: boolean; createdAt?: string })[]> => {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time, published, created_at")
      .order("date", { ascending: false });

    if (error) throw error;

    return (data as DbRow[]).map((row) => rowToMeta(row));
  },
  ["blog-posts-admin"],
  { revalidate: 300, tags: ["blog-posts-admin"] },
);

export async function getAllPostMetasFresh(): Promise<
  (BlogPostMeta & { published: boolean; createdAt?: string })[]
> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time, published, created_at")
    .order("date", { ascending: false });

  if (error) throw error;

  return (data as DbRow[]).map((row) => rowToMeta(row));
}

/**
 * Single post by slug, including full content.
 * Returns null when not found.
 * Falls back to snapshot data if Supabase fails.
 */
export function getPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  return unstable_cache(
    async (): Promise<BlogPost | null> => {
      if (!isSupabaseAdminConfigured) return getSnapshotPost(slug);
      try {
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) {
          // PGRST116 = row not found
          if (error.code === "PGRST116") return getSnapshotPost(slug);
          throw error;
        }

        return rowToPost(data as DbRow);
      } catch {
        console.warn(`[blog-supabase] Supabase read failed for ${slug}, using snapshot fallback`);
        return getSnapshotPost(slug);
      }
    },
    [getBlogPostCacheTag(slug)],
    { revalidate: CACHE_TTL, tags: [getBlogPostCacheTag(slug)] },
  )();
}

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
 * Slug list for generateStaticParams().
 * Only published posts with date <= today KST.
 * Falls back to snapshot data if Supabase query fails.
 */
export const getPublishedPostSlugs: () => Promise<string[]> = unstable_cache(
  async (): Promise<string[]> => {
    if (!isSupabaseAdminConfigured) return getSnapshotPublishedMetas().map((p) => p.slug);
    try {
      const today = getTodayKST();
      const { data, error } = await getSupabaseAdmin()
        .from(TABLE)
        .select("slug")
        .eq("published", true)
        .lte("date", today);

      if (error) throw error;

      return (data as Pick<DbRow, "slug">[]).map((row) => row.slug);
    } catch (e) {
      console.warn("[blog-supabase] Supabase query failed, using snapshot fallback for slugs", e);
      return getSnapshotPublishedMetas().map((p) => p.slug);
    }
  },
  ["blog-slugs"],
  { revalidate: CACHE_TTL, tags: ["blog-slugs"] },
);

/**
 * Related posts for a given category, excluding a specific slug.
 * Only published posts with date <= today KST.
 * Falls back to snapshot data if Supabase query fails.
 */
export function getRelatedPosts(
  category: BlogCategoryValue,
  excludeSlug: string,
  limit = 3,
): Promise<BlogPostMeta[]> {
  return unstable_cache(
    async (): Promise<BlogPostMeta[]> => {
      const snapshotFallback = () =>
        getSnapshotPublishedMetas()
          .filter((p) => p.category === category && p.slug !== excludeSlug)
          .slice(0, limit);
      if (!isSupabaseAdminConfigured) return snapshotFallback();
      try {
        const today = getTodayKST();
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time, published, created_at")
          .eq("published", true)
          .eq("category", category)
          .neq("slug", excludeSlug)
          .lte("date", today)
          .order("date", { ascending: false })
          .limit(limit);

        if (error) throw error;

        return (data as DbRow[]).map((row) => {
          const meta = rowToMeta(row);
          return {
            slug: meta.slug,
            title: meta.title,
            subtitle: meta.subtitle,
            excerpt: meta.excerpt,
            category: meta.category,
            tags: meta.tags,
            date: meta.date,
            dateModified: meta.dateModified,
            readTime: meta.readTime,
          };
        });
      } catch (e) {
        console.warn("[blog-supabase] Supabase query failed, using snapshot fallback for related posts", e);
        return snapshotFallback();
      }
    },
    [getRelatedPostsCacheKey(category, excludeSlug, limit)],
    {
      revalidate: CACHE_TTL,
      tags: [getRelatedPostsCacheTag(category)],
    },
  )();
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
    reviewed_date: null,
    published: data.published ?? false,
    created_at: now,
    updated_at: now,
    updated_by: updatedBy,
  };

  const { error } = await getSupabaseAdmin().from(TABLE).insert(row);
  if (error) throw error;

  safeRevalidateTag(CACHE_TAG);
  safeRevalidateTag("blog-slugs");
  safeRevalidateTag("blog-posts-admin");
}

export type UpdateBlogPostData = Partial<
  Omit<BlogPost, "slug" | "readTime"> & { published: boolean }
>;

/**
 * Update an existing blog post row (partial update).
 * Recalculates readTime if blocks are provided.
 */
export async function updateBlogPost(
  slug: string,
  data: UpdateBlogPostData,
  updatedBy: string,
): Promise<void> {
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
  if ("reviewedDate" in data) update.reviewed_date = data.reviewedDate ?? null;
  if (data.published !== undefined) update.published = data.published;

  if (data.blocks !== undefined) {
    update.content = data.blocks;
    update.read_time = calculateReadTime({ blocks: data.blocks });
  }

  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(update)
    .eq("slug", slug);

  if (error) throw error;

  safeRevalidateTag(CACHE_TAG);
  safeRevalidateTag(getBlogPostCacheTag(slug));
  safeRevalidateTag("blog-slugs");
  safeRevalidateTag("blog-posts-admin");
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

  safeRevalidateTag(CACHE_TAG);
  safeRevalidateTag(getBlogPostCacheTag(slug));
  safeRevalidateTag("blog-slugs");
  safeRevalidateTag("blog-posts-admin");
}
