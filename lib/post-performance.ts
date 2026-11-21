import { readingPeriodRange, type ReadingCounts } from "./blog/reading-report";
import type { BlogCategoryValue } from "./blog/types";

export const PERFORMANCE_PERIODS = ["30d", "90d"] as const;
export type PerformancePeriod = typeof PERFORMANCE_PERIODS[number];
export interface PerformancePost {
  slug: string; title: string; category: BlogCategoryValue; date: string; dateModified: string | null;
  published: boolean; updatedAt: string;
}
export type PerformanceSource<T> =
  | { status: "ready"; data: T }
  | { status: "error" | "unconfigured" | "not_public"; data: null; message: string };
export interface PostPerformance {
  post: PerformancePost;
  path: string;
  period: PerformancePeriod;
  range: ReturnType<typeof performanceRange>;
  fetchedAt: string;
  partial: boolean;
  previousSearch?: { start: string; end: string; clicks: number | null };
  search: PerformanceSource<{ clicks: number; impressions: number; ctr: number; position: number | null; queries: Array<{ query: string; clicks: number; impressions: number }>; queriesAvailable: boolean }>;
  traffic: PerformanceSource<{ views: number; sessions: number; timeZone: string; thresholded: boolean }>;
  reading: PerformanceSource<{ counts: ReadingCounts; firstObservedAt?: string | null; warnings?: string[] }>;
  readingFirstObserved?: PerformanceSource<{ firstObservedAt: string | null }>;
  feedback: PerformanceSource<{ solved: number; unresolved: number; total: number }>;
}

export const PERFORMANCE_SOURCES = ["feedback", "search", "traffic", "reading", "readingFirstObserved", "previousSearch"] as const;
export type PerformanceSourceKey = typeof PERFORMANCE_SOURCES[number];
export type PerformanceUpdate = Partial<PostPerformance> & {
  sourceTimes?: Partial<Record<PerformanceSourceKey, string>>;
  previousSearchStatus?: PerformanceSource<unknown>["status"];
};

export function performanceRange(period: PerformancePeriod, now = new Date(), endDate?: string) {
  // End three calendar days before today so recently incomplete search data is not compared with fresh traffic.
  const anchor = new Date(endDate
    ? Date.parse(`${endDate}T00:00:00+09:00`) + 86400_000
    : now.getTime() - 2 * 86400_000);
  const range = readingPeriodRange(period, anchor);
  const dateKST = (value: number) => new Date(value + 9 * 3600_000).toISOString().slice(0, 10);
  return { ...range, start: dateKST(Date.parse(range.periodStart)), end: dateKST(Date.parse(range.periodEndExclusive) - 1), anchor: anchor.toISOString() };
}

export function validPerformanceEnd(value: string, now: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === value
    && value <= performanceRange("30d", now).end
    && value >= performanceRange("30d", new Date(now.getTime() - 365 * 86400_000)).end;
}

export function isPublicPerformancePost(post: Pick<PerformancePost, "published" | "date">, today: string) {
  return post.published && /^\d{4}-\d{2}-\d{2}$/.test(post.date) && post.date <= today;
}
