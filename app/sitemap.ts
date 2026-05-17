export const revalidate = 86400;

import type { MetadataRoute } from "next";
import { stat } from "fs/promises";
import { join } from "path";
import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { getAllPublishedPostMetas } from "@/lib/blog-supabase";
import { ALL_CATEGORY_SLUGS, getBlogPostUrl } from "@/lib/blog";

const DEFAULT_LAST_MODIFIED = new Date("2026-01-01T00:00:00.000Z");

async function getLatestFileModified(paths: string[]): Promise<Date> {
  const stats = await Promise.all(
    paths.map(async (path) => {
      try {
        const file = join(process.cwd(), path);
        const value = await stat(file);
        return value.mtime;
      } catch {
        return DEFAULT_LAST_MODIFIED;
      }
    }),
  );

  return stats.reduce<Date>((latest, current) => (current > latest ? current : latest), DEFAULT_LAST_MODIFIED);
}

function getPostLastModified(post: { date: string; dateModified?: string }): Date {
  const lastModified = post.dateModified && post.dateModified > post.date
    ? post.dateModified
    : post.date;
  return new Date(lastModified);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [homeLastModified, aboutLastModified, treatmentsLastModified, contactLastModified, faqLastModified, privacyLastModified] = await Promise.all([
    getLatestFileModified(["app/page.tsx", "lib/constants.ts"]),
    getLatestFileModified(["app/about/page.tsx", "lib/constants.ts"]),
    getLatestFileModified(["app/treatments/page.tsx", "app/treatments/[slug]/page.tsx", "lib/constants.ts", "lib/treatments.ts"]),
    getLatestFileModified(["app/contact/layout.tsx", "app/contact/page.tsx", "lib/constants.ts"]),
    getLatestFileModified(["app/faq/page.tsx", "lib/treatments.ts", "lib/constants.ts"]),
    getLatestFileModified(["app/privacy/page.tsx"]),
  ]);

  const treatmentPages = TREATMENTS.map((t) => ({
    url: `${BASE_URL}${t.href}`,
    lastModified: treatmentsLastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const publishedPosts = await getAllPublishedPostMetas();

  // 블로그 허브 및 카테고리 페이지 lastmod를 최신 포스트 날짜로 자동 계산
  const latestPostDate = publishedPosts.reduce<Date>((max, p) => {
    const d = getPostLastModified(p);
    return d > max ? d : max;
  }, DEFAULT_LAST_MODIFIED);

  const latestDateByCategory = new Map<string, Date>();
  for (const p of publishedPosts) {
    const d = getPostLastModified(p);
    const prev = latestDateByCategory.get(p.category);
    if (!prev || d > prev) latestDateByCategory.set(p.category, d);
  }

  return [
    {
      url: BASE_URL,
      lastModified: homeLastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: aboutLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/treatments`,
      lastModified: treatmentsLastModified,
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
      lastModified: getPostLastModified(post),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${BASE_URL}/faq`,
      lastModified: faqLastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: contactLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: privacyLastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
