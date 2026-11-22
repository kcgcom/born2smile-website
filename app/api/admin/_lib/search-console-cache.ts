import { fetchLatestFinalSearchDate } from "@/lib/admin-search-console";
import { getTodayKST } from "@/lib/date";
import { CACHE_TTL, createCachedFetcher } from "./cache";

export function getLatestFinalSearchDate(now = new Date()) {
  const today = getTodayKST(now);
  return createCachedFetcher(
    `sc-latest-final-v1-${today}`,
    () => fetchLatestFinalSearchDate(today),
    CACHE_TTL.SEARCH_CONSOLE,
  )();
}
