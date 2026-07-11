import { revalidatePath, revalidateTag } from "next/cache";
import { getBlogPostUrl, getCategorySlug } from "@/lib/blog";
import type { BlogCategoryValue } from "@/lib/blog/types";

interface BlogCacheTarget {
  slug?: string;
  category?: BlogCategoryValue;
  previousCategory?: BlogCategoryValue;
}

function revalidateCategory(category: BlogCategoryValue) {
  const categorySlug = getCategorySlug(category);
  revalidateTag(`blog-related-${categorySlug}`, "max");
  revalidatePath(`/blog/${categorySlug}`);
}

export function revalidateBlogCaches(target: BlogCacheTarget = {}) {
  revalidateTag("blog-posts-admin", "max");
  revalidateTag("blog-posts", "max");
  revalidateTag("blog-slugs", "max");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  if (target.slug) revalidateTag(`blog-post-${target.slug}`, "max");

  if (target.category) {
    revalidateCategory(target.category);
    if (target.slug) revalidatePath(getBlogPostUrl(target.slug, target.category));
  }

  if (target.previousCategory && target.previousCategory !== target.category) {
    revalidateCategory(target.previousCategory);
  }
}
