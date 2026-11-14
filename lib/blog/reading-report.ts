import { READING_VERSION } from "./reading";

export const READING_PERIODS = ["7d", "30d", "90d", "180d"] as const;
export type ReadingPeriod = typeof READING_PERIODS[number];
export function readingPeriodRange(period: ReadingPeriod, now = new Date()) {
  const kstDate = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  const end = new Date(`${kstDate}T00:00:00+09:00`);
  const start = new Date(end.getTime() - Number(period.slice(0, -1)) * 86400_000);
  return { periodStart: start.toISOString(), periodEndExclusive: end.toISOString(), timezone: "Asia/Seoul" as const, measurementVersion: READING_VERSION };
}

export interface ReadingCounts {
  visits: number;
  eligibleVisits: number;
  qualified: number;
  depth75: number;
  time30: number;
  feedbackPrompts: number;
  solved: number;
  shares: number;
  unresolved: number;
  inquiries: number;
}
export interface ReadingReport {
  configured: boolean;
  period: ReadingPeriod;
  cursor: string | null;
  nextCursor: string | null;
  pageSize: number;
  totalPosts: number;
  meta: ReturnType<typeof readingPeriodRange> & { fetchedAt: string; firstObservedAt: string | null; partial: boolean };
  warnings: string[];
  summary: ReadingCounts;
  rows: Array<ReadingCounts & { slug: string; path: string }>;
  quality: { invalidEvents: number; orphanViews: number; duplicateStarts: number } | null;
}

export function readingRate(numerator: number, denominator: number): string {
  return denominator > 0 ? `${(100 * numerator / denominator).toFixed(1)}%` : "—";
}
