export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { BLOG_POSTS_META } from "@/lib/blog";

// 정적 페이지는 실제 최종 수정일을 고정하여 매 빌드마다 변경되지 않도록 함
const SITE_LAST_MODIFIED = new Date("2025-06-01");

export default function sitemap(): MetadataRoute.Sitemap {
  const treatmentPages = TREATMENTS.map((t) => ({
    url: `${BASE_URL}${t.href}`,
    lastModified: SITE_LAST_MODIFIED,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/treatments`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...treatmentPages,
    {
      url: `${BASE_URL}/blog`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...BLOG_POSTS_META
      .filter((post) => post.date <= new Date().toISOString().slice(0, 10))
      .map((post) => ({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.dateModified ?? post.date),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    {
      url: `${BASE_URL}/contact`,
      lastModified: SITE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
