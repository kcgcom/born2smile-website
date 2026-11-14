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
  search: PerformanceSource<{ clicks: number; impressions: number; ctr: number; position: number | null; queries: Array<{ query: string; clicks: number; impressions: number }>; queriesAvailable: boolean }>;
  traffic: PerformanceSource<{ views: number; sessions: number; timeZone: string; thresholded: boolean }>;
  reading: PerformanceSource<{ counts: ReadingCounts; firstObservedAt: string | null; warnings: string[] }>;
  feedback: PerformanceSource<{ solved: number; unresolved: number; total: number }>;
}

export function performanceRange(period: PerformancePeriod, now = new Date()) {
  // End three calendar days before today so recently incomplete search data is not compared with fresh traffic.
  const anchor = new Date(now.getTime() - 2 * 86400_000);
  const range = readingPeriodRange(period, anchor);
  const dateKST = (value: number) => new Date(value + 9 * 3600_000).toISOString().slice(0, 10);
  return { ...range, start: dateKST(Date.parse(range.periodStart)), end: dateKST(Date.parse(range.periodEndExclusive) - 1), anchor: anchor.toISOString() };
}

export function isPublicPerformancePost(post: Pick<PerformancePost, "published" | "date">, today: string) {
  return post.published && /^\d{4}-\d{2}-\d{2}$/.test(post.date) && post.date <= today;
}
