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

export function revalidateBlogCaches(target: BlogCacheTarget | BlogCacheTarget[] = {}) {
  const targets = Array.isArray(target) ? target : [target];

  revalidateTag("blog-posts-admin", "max");
  revalidateTag("blog-posts", "max");
  revalidateTag("blog-slugs", "max");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  for (const item of targets) {
    if (item.slug) revalidateTag(`blog-post-${item.slug}`, "max");

    if (item.category) {
      revalidateCategory(item.category);
      if (item.slug) revalidatePath(getBlogPostUrl(item.slug, item.category));
    }

    if (item.previousCategory && item.previousCategory !== item.category) {
      revalidateCategory(item.previousCategory);
    }
  }
}
