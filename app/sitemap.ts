export const revalidate = 86400;

import type { MetadataRoute } from "next";
import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { ALL_CATEGORY_SLUGS, getBlogLastModifiedDate, getBlogPostUrl } from "@/lib/blog";

// 정적 페이지는 실제 콘텐츠 수정일을 추적하지 않으므로 lastModified를 생략합니다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const treatmentPages = TREATMENTS.map((t) => ({
    url: `${BASE_URL}${t.href}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const publishedPosts = await getAllPublishedPostMetas();

  // 블로그 허브 및 카테고리 페이지 lastmod를 최신 포스트 날짜로 자동 계산
  const latestPostDate = publishedPosts.reduce<Date | undefined>((max, p) => {
    const d = getBlogLastModifiedDate(p);
    return !max || d > max ? d : max;
  }, undefined);

  const latestDateByCategory = new Map<string, Date>();
  for (const p of publishedPosts) {
    const d = getBlogLastModifiedDate(p);
    const prev = latestDateByCategory.get(p.category);
    if (!prev || d > prev) latestDateByCategory.set(p.category, d);
  }

  return [
    {
      url: BASE_URL,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/treatments`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...treatmentPages,
    {
      url: `${BASE_URL}/blog`,
      lastModified: latestPostDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...ALL_CATEGORY_SLUGS.map((categorySlug) => ({
      url: `${BASE_URL}/blog/${categorySlug}`,
      lastModified: latestDateByCategory.get(categorySlug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...publishedPosts.map((post) => ({
      url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
      lastModified: getBlogLastModifiedDate(post),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${BASE_URL}/faq`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
