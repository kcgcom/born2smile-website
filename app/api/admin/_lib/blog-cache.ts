import { revalidatePath, revalidateTag } from "next/cache";
import { getBlogPostUrl, getCategorySlug } from "@/lib/blog";
import { expireBlogPostCache } from "@/lib/blog-supabase";
import type { BlogCategoryValue } from "@/lib/blog/types";

interface BlogCacheTarget {
  slug?: string;
  category?: BlogCategoryValue;
  previousCategory?: BlogCategoryValue;
}

type RevalidationProfile = Parameters<typeof revalidateTag>[1];

function revalidateCategory(category: BlogCategoryValue, profile: RevalidationProfile) {
  const categorySlug = getCategorySlug(category);
  revalidateTag(`blog-related-${categorySlug}`, profile);
  revalidatePath(`/blog/${categorySlug}`);
}

export function revalidateBlogCaches(
  target: BlogCacheTarget | BlogCacheTarget[] = {},
  profile: RevalidationProfile = "max",
) {
  const targets = Array.isArray(target) ? target : [target];

  revalidateTag("blog-posts", profile);
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  for (const item of targets) {
    if (item.slug) expireBlogPostCache(item.slug);

    if (item.category) {
      revalidateCategory(item.category, profile);
      if (item.slug) revalidatePath(getBlogPostUrl(item.slug, item.category));
    }

    if (item.previousCategory && item.previousCategory !== item.category) {
      revalidateCategory(item.previousCategory, profile);
    }
  }
}
