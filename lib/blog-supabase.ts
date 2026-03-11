/**
 * Server-side Supabase helper for blog posts.
 * Uses Supabase Admin (service_role) — server components and API routes only.
 *
 * NOTE: Function names kept as-is (e.g. getPostBySlugFromFirestore) to
 * minimise call-site changes across the codebase.
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "./supabase-admin";
import type { BlogPost, BlogPostMeta, BlogPostSection } from "./blog/types";
import type { BlogCategoryValue } from "./blog/types";
import { getTodayKST } from "./date";
import { BLOG_POSTS_META } from "./blog/generated/posts-meta";

const TABLE = "blog_posts";
const CACHE_TAG = "blog-posts";
const CACHE_TTL = 3600; // 1 hour

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function calculateReadTime(content: BlogPostSection[]): string {
  const totalChars = content.reduce(
    (sum, section) =>
      sum + (section.heading?.length ?? 0) + (section.content?.length ?? 0),
    0,
  );
  return `${Math.max(1, Math.ceil(totalChars / 500))}분`;
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
  content: { heading: string; content: string }[];
  read_time: string;
  reviewed_date: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

function rowToMeta(
  row: DbRow,
): BlogPostMeta & { published: boolean; createdAt?: string } {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: row.category as BlogCategoryValue,
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
    category: row.category as BlogCategoryValue,
    tags: (row.tags ?? []) as BlogPostMeta["tags"],
    date: row.date,
    dateModified: row.date_modified ?? undefined,
    content: row.content ?? [],
    readTime: row.read_time ?? "1분",
    reviewedDate: row.reviewed_date ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// File-based fallback helpers (used when Supabase is unreachable)
// ---------------------------------------------------------------------------

function getFileBasedPublishedMetas(): BlogPostMeta[] {
  const today = getTodayKST();
  return BLOG_POSTS_META.filter((p) => p.date <= today).sort(
    (a, b) => b.date.localeCompare(a.date),
  );
}

async function getFileBasedPost(slug: string): Promise<BlogPost | null> {
  try {
    const mod = await import(`./blog/posts/${slug}.ts`);
    return (mod.post ?? mod.default) as BlogPost;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read functions (cached)
// ---------------------------------------------------------------------------

/**
 * All published posts visible to site visitors (date <= today KST).
 * Ordered by date DESC.
 * Falls back to file-based data if Supabase query fails.
 */
export const getAllPublishedPostMetas: () => Promise<BlogPostMeta[]> =
  unstable_cache(
    async (): Promise<BlogPostMeta[]> => {
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { published, ...rest } = meta;
          return rest;
        });
      } catch (e) {
        console.warn("[blog-firestore] Supabase query failed, using file-based fallback", e);
        return getFileBasedPublishedMetas();
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

/**
 * Single post by slug, including full content.
 * Returns null when not found.
 * Falls back to file-based import if Supabase fails.
 */
export function getPostBySlugFromFirestore(
  slug: string,
): Promise<BlogPost | null> {
  return unstable_cache(
    async (): Promise<BlogPost | null> => {
      try {
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) {
          // PGRST116 = row not found
          if (error.code === "PGRST116") return getFileBasedPost(slug);
          throw error;
        }

        return rowToPost(data as DbRow);
      } catch {
        console.warn(`[blog-firestore] Supabase read failed for ${slug}, using file-based fallback`);
        return getFileBasedPost(slug);
      }
    },
    [`blog-post-${slug}`],
    { revalidate: CACHE_TTL, tags: [`blog-post-${slug}`] },
  )();
}

/**
 * Slug list for generateStaticParams().
 * Only published posts with date <= today KST.
 * Falls back to file-based data if Supabase query fails.
 */
export const getPublishedPostSlugs: () => Promise<string[]> = unstable_cache(
  async (): Promise<string[]> => {
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
      console.warn("[blog-firestore] Supabase query failed, using file-based fallback for slugs", e);
      return getFileBasedPublishedMetas().map((p) => p.slug);
    }
  },
  ["blog-slugs"],
  { revalidate: CACHE_TTL, tags: ["blog-slugs"] },
);

/**
 * Related posts for a given category, excluding a specific slug.
 * Only published posts with date <= today KST.
 * Falls back to file-based data if Supabase query fails.
 */
export function getRelatedPostsFromFirestore(
  category: BlogCategoryValue,
  excludeSlug: string,
  limit = 3,
): Promise<BlogPostMeta[]> {
  return unstable_cache(
    async (): Promise<BlogPostMeta[]> => {
      try {
        const today = getTodayKST();
        const { data, error } = await getSupabaseAdmin()
          .from(TABLE)
          .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, read_time, published, created_at")
          .eq("published", true)
          .eq("category", category)
          .lte("date", today)
          .limit(limit + 1);

        if (error) throw error;

        return (data as DbRow[])
          .map((row) => {
            const meta = rowToMeta(row);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { published, ...rest } = meta;
            return rest;
          })
          .filter((post) => post.slug !== excludeSlug)
          .slice(0, limit);
      } catch (e) {
        console.warn("[blog-firestore] Supabase query failed, using file-based fallback for related posts", e);
        return getFileBasedPublishedMetas()
          .filter((p) => p.category === category && p.slug !== excludeSlug)
          .slice(0, limit);
      }
    },
    [`blog-related-${category}-${excludeSlug}`],
    {
      revalidate: CACHE_TTL,
      tags: [`blog-related-${category}`],
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
 * Calculates readTime from content automatically.
 */
export async function createBlogPost(
  data: CreateBlogPostData,
  updatedBy: string,
): Promise<void> {
  const now = new Date().toISOString();
  const readTime = calculateReadTime(data.content);

  const row = {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    category: data.category,
    tags: data.tags,
    date: data.date,
    date_modified: data.dateModified ?? null,
    content: data.content,
    read_time: readTime,
    reviewed_date: null,
    published: data.published ?? false,
    created_at: now,
    updated_at: now,
    updated_by: updatedBy,
  };

  const { error } = await getSupabaseAdmin().from(TABLE).insert(row);
  if (error) throw error;

  revalidateTag(CACHE_TAG, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
}

export type UpdateBlogPostData = Partial<
  Omit<BlogPost, "slug" | "readTime"> & { published: boolean }
>;

/**
 * Update an existing blog post row (partial update).
 * Recalculates readTime if content is provided.
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

  if (data.content !== undefined) {
    update.content = data.content;
    update.read_time = calculateReadTime(data.content);
  }

  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(update)
    .eq("slug", slug);

  if (error) throw error;

  revalidateTag(CACHE_TAG, "max");
  revalidateTag(`blog-post-${slug}`, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
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

  revalidateTag(CACHE_TAG, "max");
  revalidateTag(`blog-post-${slug}`, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
}
