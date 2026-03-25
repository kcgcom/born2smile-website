import { BASE_URL } from "./constants";
import { getCategorySlug } from "./blog";
import type { BlogCategoryValue } from "./blog";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY ?? null;
}

function getIndexNowKeyLocation(key: string): string {
  return `${BASE_URL}/${key}.txt`;
}

export async function submitIndexNowUrls(urls: string[]): Promise<void> {
  const key = getIndexNowKey();
  if (!key || urls.length === 0) return;

  const uniqueUrls = [...new Set(urls)];
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(BASE_URL).host,
      key,
      keyLocation: getIndexNowKeyLocation(key),
      urlList: uniqueUrls,
    }),
  });

  if (!response.ok && response.status !== 202) {
    const text = await response.text().catch(() => "");
    throw new Error(`IndexNow 제출 실패 (HTTP ${response.status}) ${text}`.trim());
  }
}

export async function submitBlogPostToIndexNow(slug: string, category: BlogCategoryValue): Promise<void> {
  const categorySlug = getCategorySlug(category);
  await submitIndexNowUrls([
    `${BASE_URL}/blog/${categorySlug}/${slug}`,
    `${BASE_URL}/blog`,
    `${BASE_URL}/sitemap.xml`,
  ]);
}
