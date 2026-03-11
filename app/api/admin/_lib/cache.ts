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
  SEARCHAD_VOLUME: 86400,  // 24 hours — 검색량은 월간 데이터이므로 하루 1회 갱신 충분
  PSI: 86400,              // 24 hours — PageSpeed Insights (Supabase L2 캐시 병용)
} as const;
