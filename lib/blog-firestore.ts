/**
 * Server-side Firestore helper for blog posts.
 * Uses Firebase Admin SDK — server components and API routes only.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { unstable_cache, revalidateTag } from "next/cache";
import { getAdminApp } from "./firebase-admin";
import type { BlogPost, BlogPostMeta, BlogPostSection } from "./blog/types";
import type { BlogCategoryValue } from "./blog/types";
import { getTodayKST } from "./date";
import { BLOG_POSTS_META } from "./blog/generated/posts-meta";

const COLLECTION = "blog-posts";
const CACHE_TAG = "blog-posts";
const CACHE_TTL = 3600; // 1 hour

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getDb() {
  return getFirestore(getAdminApp());
}

function calculateReadTime(content: BlogPostSection[]): string {
  const totalChars = content.reduce(
    (sum, section) =>
      sum + (section.heading?.length ?? 0) + (section.content?.length ?? 0),
    0,
  );
  return `${Math.max(1, Math.ceil(totalChars / 500))}분`;
}

interface FirestoreDocData {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  dateModified: string | null;
  content: { heading: string; content: string }[];
  readTime: string;
  reviewedDate: string | null;
  published: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  updatedBy: string;
}

function docToMeta(
  data: FirebaseFirestore.DocumentData,
): BlogPostMeta & { published: boolean } {
  return {
    slug: data.slug as string,
    title: data.title as string,
    subtitle: data.subtitle as string,
    excerpt: data.excerpt as string,
    category: data.category as BlogCategoryValue,
    tags: ((data.tags as string[] | undefined) ?? []) as BlogPostMeta["tags"],
    date: data.date as string,
    dateModified: (data.dateModified as string | null | undefined) ?? undefined,
    readTime: (data.readTime as string | undefined) ?? "1분",
    published: (data.published as boolean | undefined) ?? true,
  };
}

function docToPost(data: FirebaseFirestore.DocumentData): BlogPost {
  return {
    slug: data.slug as string,
    title: data.title as string,
    subtitle: data.subtitle as string,
    excerpt: data.excerpt as string,
    category: data.category as BlogCategoryValue,
    tags: ((data.tags as string[] | undefined) ?? []) as BlogPostMeta["tags"],
    date: data.date as string,
    dateModified: (data.dateModified as string | null | undefined) ?? undefined,
    content:
      (data.content as { heading: string; content: string }[] | undefined) ??
      [],
    readTime: (data.readTime as string | undefined) ?? "1분",
    reviewedDate:
      (data.reviewedDate as string | null | undefined) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// File-based fallback helpers (used when Firestore indexes are not yet deployed)
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

function isIndexError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.message.includes("FAILED_PRECONDITION") ||
      e.message.includes("requires an index"))
  );
}

// ---------------------------------------------------------------------------
// Read functions (cached)
// ---------------------------------------------------------------------------

/**
 * All published posts visible to site visitors (date <= today KST).
 * Ordered by date DESC.
 * Falls back to file-based data if Firestore composite index is missing.
 */
export const getAllPublishedPostMetas: () => Promise<BlogPostMeta[]> =
  unstable_cache(
    async (): Promise<BlogPostMeta[]> => {
      try {
        const today = getTodayKST();
        const snapshot = await getDb()
          .collection(COLLECTION)
          .where("published", "==", true)
          .where("date", "<=", today)
          .orderBy("date", "desc")
          .get();

        return snapshot.docs.map((doc) => {
          const meta = docToMeta(doc.data());
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { published, ...rest } = meta;
          return rest;
        });
      } catch (e) {
        if (isIndexError(e)) {
          console.warn("[blog-firestore] Composite index missing, using file-based fallback");
          return getFileBasedPublishedMetas();
        }
        throw e;
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
  (BlogPostMeta & { published: boolean })[]
> = unstable_cache(
  async (): Promise<(BlogPostMeta & { published: boolean })[]> => {
    const snapshot = await getDb()
      .collection(COLLECTION)
      .orderBy("date", "desc")
      .get();

    return snapshot.docs.map((doc) => docToMeta(doc.data()));
  },
  ["blog-posts-admin"],
  { revalidate: 300, tags: ["blog-posts-admin"] },
);

/**
 * Single post by slug, including full content.
 * Returns null when not found.
 * Falls back to file-based import if Firestore fails.
 */
export function getPostBySlugFromFirestore(
  slug: string,
): Promise<BlogPost | null> {
  return unstable_cache(
    async (): Promise<BlogPost | null> => {
      try {
        const doc = await getDb().collection(COLLECTION).doc(slug).get();
        if (!doc.exists) return getFileBasedPost(slug);
        return docToPost(doc.data()!);
      } catch {
        console.warn(`[blog-firestore] Firestore read failed for ${slug}, using file-based fallback`);
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
 * Falls back to file-based data if Firestore composite index is missing.
 */
export const getPublishedPostSlugs: () => Promise<string[]> = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const today = getTodayKST();
      const snapshot = await getDb()
        .collection(COLLECTION)
        .where("published", "==", true)
        .where("date", "<=", today)
        .select("slug")
        .get();

      return snapshot.docs.map((doc) => doc.data().slug as string);
    } catch (e) {
      if (isIndexError(e)) {
        console.warn("[blog-firestore] Composite index missing, using file-based fallback for slugs");
        return getFileBasedPublishedMetas().map((p) => p.slug);
      }
      throw e;
    }
  },
  ["blog-slugs"],
  { revalidate: CACHE_TTL, tags: ["blog-slugs"] },
);

/**
 * Related posts for a given category, excluding a specific slug.
 * Only published posts with date <= today KST.
 * Falls back to file-based data if Firestore composite index is missing.
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
        const snapshot = await getDb()
          .collection(COLLECTION)
          .where("published", "==", true)
          .where("category", "==", category)
          .where("date", "<=", today)
          .limit(limit + 1)
          .get();

        return snapshot.docs
          .map((doc) => {
            const meta = docToMeta(doc.data());
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { published, ...rest } = meta;
            return rest;
          })
          .filter((post) => post.slug !== excludeSlug)
          .slice(0, limit);
      } catch (e) {
        if (isIndexError(e)) {
          console.warn("[blog-firestore] Composite index missing, using file-based fallback for related posts");
          return getFileBasedPublishedMetas()
            .filter((p) => p.category === category && p.slug !== excludeSlug)
            .slice(0, limit);
        }
        throw e;
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
 * Create a new blog post document.
 * Calculates readTime from content automatically.
 */
export async function createBlogPost(
  data: CreateBlogPostData,
  updatedBy: string,
): Promise<void> {
  const db = getDb();
  const now = Timestamp.now();
  const readTime = calculateReadTime(data.content);

  const doc: FirestoreDocData = {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle,
    excerpt: data.excerpt,
    category: data.category,
    tags: data.tags,
    date: data.date,
    dateModified: data.dateModified ?? null,
    content: data.content,
    readTime,
    reviewedDate: null,
    published: data.published ?? false,
    createdAt: now,
    updatedAt: now,
    updatedBy,
  };

  await db.collection(COLLECTION).doc(data.slug).set(doc);

  revalidateTag(CACHE_TAG, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
}

export type UpdateBlogPostData = Partial<
  Omit<BlogPost, "slug" | "readTime"> & { published: boolean }
>;

/**
 * Update an existing blog post document (partial update).
 * Recalculates readTime if content is provided.
 */
export async function updateBlogPost(
  slug: string,
  data: UpdateBlogPostData,
  updatedBy: string,
): Promise<void> {
  const db = getDb();

  const update: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
    updatedBy,
  };

  if (data.title !== undefined) update.title = data.title;
  if (data.subtitle !== undefined) update.subtitle = data.subtitle;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.category !== undefined) update.category = data.category;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.date !== undefined) update.date = data.date;
  if ("dateModified" in data) update.dateModified = data.dateModified ?? null;
  if ("reviewedDate" in data) update.reviewedDate = data.reviewedDate ?? null;
  if (data.published !== undefined) update.published = data.published;

  if (data.content !== undefined) {
    update.content = data.content;
    update.readTime = calculateReadTime(data.content);
  }

  await db.collection(COLLECTION).doc(slug).update(update);

  revalidateTag(CACHE_TAG, "max");
  revalidateTag(`blog-post-${slug}`, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
}

/**
 * Delete a blog post document by slug.
 */
export async function deleteBlogPost(slug: string): Promise<void> {
  await getDb().collection(COLLECTION).doc(slug).delete();

  revalidateTag(CACHE_TAG, "max");
  revalidateTag(`blog-post-${slug}`, "max");
  revalidateTag("blog-slugs", "max");
  revalidateTag("blog-posts-admin", "max");
}
