import { unstable_cache } from "next/cache";

export function createCachedFetcher<T>(
  key: string,
  fetcher: () => Promise<T>,
  revalidateSeconds: number | (() => number),
) {
  const ttl = typeof revalidateSeconds === "function" ? revalidateSeconds() : revalidateSeconds;
  return unstable_cache(fetcher, [key], { revalidate: ttl });
}

/** KST 자정까지 남은 초 (최소 600초 = 10분) */
export function secondsUntilMidnightKST(): number {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const midnight = new Date(kst);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return Math.max(600, Math.floor((midnight.getTime() - kst.getTime()) / 1000));
}

export const CACHE_TTL = {
  SEARCH_CONSOLE: 21600,   // 6 hours
  NAVER_DATALAB: 86400,    // 24 hours — 트렌드 데이터는 일별/주별이므로 하루 1회 갱신 충분
  BLOG_LIKES: 300,         // 5 minutes
  POSTHOG: 300,            // 5 minutes — CTA/전환 모니터링
  SEARCHAD_VOLUME: 86400,  // 24 hours — 검색량은 월간 데이터이므로 하루 1회 갱신 충분
  PSI: 86400,              // 24 hours — PageSpeed Insights (Supabase L2 캐시 병용)
} as const;
