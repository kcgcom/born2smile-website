import { BASE_URL, TREATMENTS } from "@/lib/constants";
import { ALL_CATEGORY_SLUGS } from "@/lib/blog/category-slugs";

export const SITEMAP_CORE_PAGES = [
  { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
  { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/treatments`, changeFrequency: "monthly", priority: 0.8 },
] as const;
export const SITEMAP_OTHER_PAGES = [
  { url: `${BASE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
] as const;
export const SITEMAP_BLOG_PATH = "/blog";

export function getStaticSitemapUrls(): string[] {
  return [
    ...SITEMAP_CORE_PAGES.map(({ url }) => url),
    ...TREATMENTS.map((treatment) => `${BASE_URL}${treatment.href}`),
    `${BASE_URL}${SITEMAP_BLOG_PATH}`,
    ...ALL_CATEGORY_SLUGS.map((category) => `${BASE_URL}${SITEMAP_BLOG_PATH}/${category}`),
    ...SITEMAP_OTHER_PAGES.map(({ url }) => url),
  ];
}
