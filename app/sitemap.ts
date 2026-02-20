export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { BLOG_POSTS_META } from "@/lib/blog";

// 페이지별 실제 최종 수정일 (콘텐츠 변경 시 업데이트)
const PAGE_MODIFIED = {
  home: new Date("2026-02-19"),
  about: new Date("2026-02-15"),
  treatments: new Date("2026-02-15"),
  blog: new Date("2026-02-19"),
  contact: new Date("2026-02-01"),
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const treatmentPages = TREATMENTS.map((t) => ({
    url: `${BASE_URL}${t.href}`,
    lastModified: PAGE_MODIFIED.treatments,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

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
      lastModified: PAGE_MODIFIED.blog,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...BLOG_POSTS_META
      .filter((post) => post.date <= new Date().toISOString().slice(0, 10))
      .map((post) => ({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.dateModified ?? post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    {
      url: `${BASE_URL}/contact`,
      lastModified: PAGE_MODIFIED.contact,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
