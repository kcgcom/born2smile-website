export const revalidate = 86400;

import type { MetadataRoute } from "next";
import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { ALL_CATEGORY_SLUGS, getBlogPostUrl } from "@/lib/blog";

// 페이지별 실제 최종 수정일 (콘텐츠 변경 시 업데이트)
const PAGE_MODIFIED = {
  home: new Date("2026-03-27"),
  about: new Date("2026-03-27"),
  treatments: new Date("2026-03-27"),
  blog: new Date("2026-03-27"),
  contact: new Date("2026-02-20"),
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const treatmentPages = TREATMENTS.map((t) => ({
    url: `${BASE_URL}${t.href}`,
    lastModified: PAGE_MODIFIED.treatments,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const publishedPosts = await getAllPublishedPostMetas();

  // 블로그 허브 및 카테고리 페이지 lastmod를 최신 포스트 날짜로 자동 계산
  const latestPostDate = publishedPosts.reduce<Date>((max, p) => {
    const d = new Date(p.dateModified ?? p.date);
    return d > max ? d : max;
  }, PAGE_MODIFIED.blog);

  const latestDateByCategory = new Map<string, Date>();
  for (const p of publishedPosts) {
    const d = new Date(p.dateModified ?? p.date);
    const prev = latestDateByCategory.get(p.category);
    if (!prev || d > prev) latestDateByCategory.set(p.category, d);
  }

  return [
    {
      url: BASE_URL,
      lastModified: PAGE_MODIFIED.home,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: PAGE_MODIFIED.about,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/treatments`,
      lastModified: PAGE_MODIFIED.treatments,
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
      lastModified: latestDateByCategory.get(categorySlug) ?? latestPostDate,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...publishedPosts.map((post) => ({
      url: `${BASE_URL}${getBlogPostUrl(post.slug, post.category)}`,
      lastModified: new Date(post.dateModified ?? post.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${BASE_URL}/faq`,
      lastModified: PAGE_MODIFIED.treatments,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: PAGE_MODIFIED.contact,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
