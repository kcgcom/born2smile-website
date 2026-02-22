import { unstable_cache } from "next/cache";

export function createCachedFetcher<T>(
  key: string,
  fetcher: () => Promise<T>,
  revalidateSeconds: number,
) {
  return unstable_cache(fetcher, [key], { revalidate: revalidateSeconds });
}

export const CACHE_TTL = {
  GA4_SUMMARY: 3600,      // 1 hour
  GA4_DAILY: 21600,        // 6 hours
  SEARCH_CONSOLE: 21600,   // 6 hours
  NAVER_DATALAB: 21600,    // 6 hours
  BLOG_LIKES: 300,         // 5 minutes
} as const;
