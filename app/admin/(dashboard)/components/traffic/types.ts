import type { MetricValue } from "../insight/shared";

export interface AnalyticsData {
  propertyId: string;
  analyticsUrl: string;
  dataAsOf: string;
  period: { start: string; end: string };
  comparePeriod: { start: string; end: string };
  summary: {
    sessions: MetricValue;
    users: MetricValue;
    pageviews: MetricValue;
    avgDuration: MetricValue;
    bounceRate: MetricValue;
  };
  topPages: Array<{ path: string; views: number; sessions: number }>;
  topPageDetails: Record<string, TopPageDetail>;
  trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
  sourceDetails: Record<string, SourceDetail>;
  devices: Array<{ category: string; sessions: number; percentage: number }>;
  dailyTrend: Array<{ date: string; sessions: number; pageviews: number }>;
  cities: Array<{ city: string; sessions: number; percentage: number }>;
  newVsReturning: Array<{ label: string; sessions: number; percentage: number }>;
  hourlyPattern: Array<{ hour: string; sessions: number }>;
  dowPattern: Array<{ day: string; sessions: number }>;
}

export interface TopPageDetail {
  isBlogAggregate: boolean;
  isSectionAggregate: boolean;
  aggregateLabel: string | null;
  summary: {
    views: number;
    sessions: number;
    pageviewsPerSession: number;
  };
  dailyTrend: Array<{ date: string; sessions: number; pageviews: number }>;
  sources: Array<{ source: string; sessions: number; percentage: number }>;
  topChildPages: Array<{ path: string; views: number; sessions: number }>;
}

export interface SourceDetail {
  summary: {
    sessions: number;
    engagedSessions: number;
    engagementRate: number;
    avgDuration: number;
    bounceRate: number;
    pageviewsPerSession: number;
  };
  topLandingPages: Array<{ path: string; views: number; sessions: number }>;
  dailyTrend: Array<{ date: string; sessions: number; pageviews: number }>;
  devices: Array<{ category: string; sessions: number; percentage: number }>;
}

export interface BlogGA4Data {
  blogPostStats: Array<{ path: string; pageViews: number; avgDuration: number }>;
  dataAsOf: string;
}

export interface ConversionData {
  configured: boolean;
  period: "7d" | "30d" | "90d" | "180d";
  summary: {
    totalShareActions: number;
    totalShareVisits: number;
    shareVisitRate: number | null;
    nativeShareActions: number;
    copyShareActions: number;
  };
}

export type Period = "30d" | "90d" | "180d";
export type TrafficView = "overall" | "blog";

export const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "30d", label: "1개월" },
  { value: "90d", label: "3개월" },
  { value: "180d", label: "6개월" },
];

export const TRAFFIC_VIEWS: Array<{ value: TrafficView; label: string }> = [
  { value: "overall", label: "전체" },
  { value: "blog", label: "블로그" },
];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

import { formatDuration } from "../insight/shared";

export function formatDurationDelta(current: number, baseline: number) {
  const diff = current - baseline;
  if (!Number.isFinite(diff) || baseline <= 0 || diff === 0) return "평균과 비슷";
  return diff > 0
    ? `평균보다 ${formatDuration(diff)} 길게 읽힘`
    : `평균보다 ${formatDuration(Math.abs(diff))} 짧게 읽힘`;
}

export function toBlogAnalyticsPeriod(period: Period): "28d" | "90d" | "180d" {
  if (period === "90d") return "90d";
  if (period === "180d") return "180d";
  return "28d";
}

export function getBlogSlugFromPath(path: string) {
  const match = path.match(/^\/blog\/[^/]+\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

export function getTopPageDisplayTitle(path: string, blogTitleMap: Map<string, string>) {
  if (path === "/blog (전체)") return "블로그 전체";
  if (path === "/treatments (전체)") return "치료 페이지 전체";
  if (path === "/research (전체)") return "리서치 전체";

  return blogTitleMap.get(getBlogSlugFromPath(path) ?? "") ?? path;
}
