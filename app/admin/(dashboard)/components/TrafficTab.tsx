"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAdminApi } from "./useAdminApi";
import { DataTable } from "./DataTable";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { formatDuration } from "./insight/shared";
import type { MetricValue } from "./insight/shared";
import type { AdminBlogPost } from "./blog/blog-helpers";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface AnalyticsData {
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
  topPageDetails: Record<
    string,
    {
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
  >;
  trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
  sourceDetails: Record<
    string,
    {
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
  >;
  devices: Array<{ category: string; sessions: number; percentage: number }>;
  dailyTrend: Array<{ date: string; sessions: number; pageviews: number }>;
  cities: Array<{ city: string; sessions: number; percentage: number }>;
  newVsReturning: Array<{ label: string; sessions: number; percentage: number }>;
  hourlyPattern: Array<{ hour: string; sessions: number }>;
  dowPattern: Array<{ day: string; sessions: number }>;
}

interface BlogGA4Data {
  blogPostStats: Array<{ path: string; pageViews: number; avgDuration: number }>;
  dataAsOf: string;
}

interface ConversionData {
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

type Period = "30d" | "90d" | "180d";
type TrafficView = "overall" | "blog";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "30d", label: "1개월" },
  { value: "90d", label: "3개월" },
  { value: "180d", label: "6개월" },
];

const TRAFFIC_VIEWS: Array<{ value: TrafficView; label: string }> = [
  { value: "overall", label: "전체" },
  { value: "blog", label: "블로그" },
];

const DEVICE_LABELS: Record<string, string> = {
  mobile: "모바일",
  desktop: "데스크톱",
  tablet: "태블릿",
};

const CHART_COLORS = [
  "#2563EB", // var(--color-primary)
  "#C9962B", // var(--color-gold)
  "#0EA5E9", // var(--color-secondary)
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F59E0B", // amber
];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function formatDateLabel(date: string): string {
  if (date.length === 10) return date.slice(5).replace("-", ".");
  return date;
}

function formatDurationDelta(current: number, baseline: number) {
  const diff = current - baseline;
  if (!Number.isFinite(diff) || baseline <= 0 || diff === 0) return "평균과 비슷";
  return diff > 0
    ? `평균보다 ${formatDuration(diff)} 길게 읽힘`
    : `평균보다 ${formatDuration(Math.abs(diff))} 짧게 읽힘`;
}

function toBlogAnalyticsPeriod(period: Period): "28d" | "90d" | "180d" {
  if (period === "90d") return "90d";
  if (period === "180d") return "180d";
  return "28d";
}

function getBlogSlugFromPath(path: string) {
  const match = path.match(/^\/blog\/[^/]+\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

function getTopPageDisplayTitle(path: string, blogTitleMap: Map<string, string>) {
  if (path === "/blog (전체)") return "블로그 전체";
  if (path === "/treatments (전체)") return "치료 페이지 전체";
  if (path === "/research (전체)") return "리서치 전체";

  return blogTitleMap.get(getBlogSlugFromPath(path) ?? "") ?? path;
}

// ---------------------------------------------------------------
// Recharts – dynamically imported (no SSR)
// ---------------------------------------------------------------

const TopPagesChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Cell,
      }) => {
        function TopPagesChartInner({
          data,
          selectedPath,
          onSelect,
        }: {
          data: Array<{ path: string; views: number; sessions: number }>;
          selectedPath?: string | null;
          onSelect?: (path: string) => void;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const truncate = (path: string) =>
            path.length > 22 ? path.slice(0, 21) + "…" : path;

          return (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                />
                <YAxis
                  type="category"
                  dataKey="path"
                  width={110}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={truncate}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string) => [(value ?? 0).toLocaleString("ko-KR"), name === "views" ? "조회수" : "세션수"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {data.map((item) => (
                    <Cell
                      key={item.path}
                      fill={CHART_COLORS[0]}
                      fillOpacity={!selectedPath || selectedPath === item.path ? 0.85 : 0.35}
                      onClick={onSelect ? () => onSelect(item.path) : undefined}
                      style={onSelect ? { cursor: "pointer" } : undefined}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return TopPagesChartInner;
      },
    ),
  { ssr: false },
);

const TrafficSourceChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
        Tooltip,
        Legend,
      }) => {
        function TrafficSourceChartInner({
          data,
          selectedSource,
          onSelect,
        }: {
          data: Array<{ source: string; sessions: number; percentage: number }>;
          selectedSource: string | null;
          onSelect: (source: string) => void;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          return (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sessions"
                  nameKey="source"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                >
                  {data.map((item, idx) => (
                    <Cell
                      key={item.source}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={!selectedSource || selectedSource === item.source ? 1 : 0.35}
                      onClick={() => onSelect(item.source)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, name]) as any
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          );
        }
        return TrafficSourceChartInner;
      },
    ),
  { ssr: false },
);

const DeviceChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
        Tooltip,
        Legend,
      }) => {
        function DeviceChartInner({
          data,
        }: {
          data: Array<{ category: string; sessions: number; percentage: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const labeled = data.map((d) => ({
            ...d,
            label: DEVICE_LABELS[d.category] ?? d.category,
          }));

          return (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={labeled}
                  dataKey="sessions"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                >
                  {labeled.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, name]) as any
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          );
        }
        return DeviceChartInner;
      },
    ),
  { ssr: false },
);

const DailyTrendChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        AreaChart,
        Area,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
      }) => {
        function DailyTrendChartInner({
          data,
        }: {
          data: Array<{ date: string; sessions: number; pageviews: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const formatted = data.map((d) => ({
            ...d,
            dateLabel: formatDateLabel(d.date),
          }));

          return (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={formatted}
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string) => [(value ?? 0).toLocaleString("ko-KR"), name === "sessions" ? "세션" : "페이지뷰"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827", fontWeight: 600 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#sessionsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2563EB" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        return DailyTrendChartInner;
      },
    ),
  { ssr: false },
);


const CityChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Cell,
      }) => {
        function CityChartInner({
          data,
        }: {
          data: Array<{ city: string; sessions: number; percentage: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          return (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                />
                <YAxis
                  type="category"
                  dataKey="city"
                  width={70}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, _name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, "세션"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[2]} fillOpacity={idx === 0 ? 1 : 0.6 - idx * 0.04} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return CityChartInner;
      },
    ),
  { ssr: false },
);

const NewVsReturningChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
        Tooltip,
        Legend,
      }) => {
        function NewVsReturningChartInner({
          data,
        }: {
          data: Array<{ label: string; sessions: number; percentage: number }>;
        }) {
          if (data.length === 0 || data.every((d) => d.sessions === 0)) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          return (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sessions"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                >
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, name]) as any
                  }
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
          );
        }
        return NewVsReturningChartInner;
      },
    ),
  { ssr: false },
);

const HourlyPatternChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Cell,
      }) => {
        function HourlyPatternChartInner({
          data,
        }: {
          data: Array<{ hour: string; sessions: number }>;
        }) {
          if (data.length === 0) {
            return <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>;
          }
          const max = Math.max(...data.map((d) => d.sessions));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined) => [`${(value ?? 0).toLocaleString("ko-KR")}건`, "세션"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="sessions" radius={[3, 3, 0, 0]} maxBarSize={16}>
                  {data.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.sessions === max ? CHART_COLORS[1] : CHART_COLORS[0]}
                      fillOpacity={d.sessions === max ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return HourlyPatternChartInner;
      },
    ),
  { ssr: false },
);

const DowPatternChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Cell,
      }) => {
        function DowPatternChartInner({
          data,
        }: {
          data: Array<{ day: string; sessions: number }>;
        }) {
          if (data.length === 0) {
            return <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>;
          }
          const max = Math.max(...data.map((d) => d.sessions));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined) => [`${(value ?? 0).toLocaleString("ko-KR")}건`, "세션"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="sessions" radius={[3, 3, 0, 0]} maxBarSize={36}>
                  {data.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.sessions === max ? CHART_COLORS[1] : CHART_COLORS[0]}
                      fillOpacity={d.sessions === max ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return DowPatternChartInner;
      },
    ),
  { ssr: false },
);

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function TrafficTab() {
  const [period, setPeriod] = useState<Period>("30d");
  const [view, setView] = useState<TrafficView>("overall");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTopPage, setSelectedTopPage] = useState<string | null>(null);
  const [blogSortKey, setBlogSortKey] = useState<"sessions" | "views" | "avgDuration">("sessions");
  const [blogSortDir, setBlogSortDir] = useState<"asc" | "desc">("desc");

  const { data, loading, error, refetch } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}`,
  );
  const {
    data: blogGa4Data,
    loading: blogGa4Loading,
    error: blogGa4Error,
  } = useAdminApi<BlogGA4Data>(
    `/api/admin/blog-analytics?period=${toBlogAnalyticsPeriod(period)}`,
  );
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>(
    `/api/admin/posthog/conversion?period=${period}`,
  );
  const { data: blogPostsData } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const sourceDetails = useMemo(() => data?.sourceDetails ?? {}, [data?.sourceDetails]);
  const topPageDetails = useMemo(() => data?.topPageDetails ?? {}, [data?.topPageDetails]);
  const blogAggregateDetail = data?.topPageDetails["/blog (전체)"] ?? null;
  const blogTitleMap = useMemo(() => {
    return new Map((blogPostsData ?? []).map((post) => [post.slug, post.title]));
  }, [blogPostsData]);

  const activeSource = selectedSource && sourceDetails[selectedSource]
    ? selectedSource
    : null;
  const activeSourceDetail = activeSource ? sourceDetails[activeSource] : null;
  const activeTopPage = selectedTopPage && topPageDetails[selectedTopPage]
    ? selectedTopPage
    : null;
  const activeTopPageDetail = activeTopPage ? topPageDetails[activeTopPage] : null;
  const blogSummary = useMemo(() => {
    const rows = blogGa4Data?.blogPostStats ?? [];
    const fallbackPageViews = blogAggregateDetail?.summary.views ?? 0;

    if (rows.length === 0) {
      return {
        pageViews: fallbackPageViews,
        avgDuration: 0,
        trackedPosts: 0,
      };
    }

    const pageViews = rows.reduce((sum, row) => sum + row.pageViews, 0);
    const weightedDuration = rows.reduce((sum, row) => sum + row.avgDuration * row.pageViews, 0);

    return {
      pageViews: pageViews || fallbackPageViews,
      avgDuration: pageViews > 0 ? Math.round(weightedDuration / pageViews) : 0,
      trackedPosts: rows.length,
    };
  }, [blogAggregateDetail?.summary.views, blogGa4Data]);
  const blogGa4Map = useMemo(() => {
    return new Map((blogGa4Data?.blogPostStats ?? []).map((item) => [item.path, item]));
  }, [blogGa4Data]);
  const blogPerformanceRows = useMemo(() => {
    const rows = (blogGa4Data?.blogPostStats ?? []).map((item) => ({
      path: item.path,
      views: item.pageViews,
      sessions: topPageDetails[item.path]?.summary.sessions ?? 0,
      avgDuration: item.avgDuration,
    }));
    const dir = blogSortDir === "desc" ? -1 : 1;
    return rows.sort((a, b) => (b[blogSortKey] - a[blogSortKey]) * dir);
  }, [blogGa4Data, topPageDetails, blogSortKey, blogSortDir]);

  function handleBlogSort(key: string) {
    const k = key as "sessions" | "views" | "avgDuration";
    if (k === blogSortKey) {
      setBlogSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setBlogSortKey(k);
      setBlogSortDir("desc");
    }
  }
  const activeBlogPosts = useMemo(
    () => (blogGa4Data?.blogPostStats ?? []).filter((item) => item.pageViews > 0).length,
    [blogGa4Data],
  );
  const comparableBlogPosts = useMemo(() => {
    return (blogGa4Data?.blogPostStats ?? [])
      .filter((item) => item.pageViews >= 20 && item.avgDuration > 0);
  }, [blogGa4Data]);
  const longestReadPosts = useMemo(() => {
    return comparableBlogPosts
      .filter((item) => item.avgDuration > blogSummary.avgDuration)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);
  }, [blogSummary.avgDuration, comparableBlogPosts]);
  const shortestReadPosts = useMemo(() => {
    return comparableBlogPosts
      .filter((item) => item.avgDuration < blogSummary.avgDuration)
      .sort((a, b) => a.avgDuration - b.avgDuration)
      .slice(0, 5);
  }, [blogSummary.avgDuration, comparableBlogPosts]);
  const blogSourceShare = useMemo(() => {
    return (blogAggregateDetail?.sources ?? []).slice(0, 6);
  }, [blogAggregateDetail?.sources]);
  const activeTopPageDuration = activeTopPage ? blogGa4Map.get(activeTopPage)?.avgDuration ?? 0 : 0;
  const activeTopPageTitle = activeTopPage
    ? getTopPageDisplayTitle(activeTopPage, blogTitleMap)
    : "";

  return (
    <div className="space-y-6">
      <ApiSourceBadge
        sources={["ga4"]}
        urlOverrides={data?.analyticsUrl ? { ga4: data.analyticsUrl } : undefined}
      />

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS}
          selected={period}
          onChange={(v) => {
            setPeriod(v as Period);
            setSelectedSource(null);
            setSelectedTopPage(null);
          }}
        />
        {data?.period && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            집계 기간: {data.period.start} ~ {data.period.end}
          </span>
        )}
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf} (어제 기준)
          </span>
        )}
        <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
          탭별 데이터 지연 기준이 달라 검색 성과 탭과 날짜 범위가 완전히 같지 않을 수 있습니다.
        </span>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-slate-100/80 p-1">
        {TRAFFIC_VIEWS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setView(item.value);
              setSelectedSource(null);
              setSelectedTopPage(null);
            }}
            className={`rounded-lg px-4 py-1.5 text-sm transition-all ${
              view === item.value
                ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <AdminLoadingSkeleton variant="full" />}

      {/* Error */}
      {!loading && error && (
        <AdminErrorState message={error} onRetry={refetch} />
      )}

      {/* Data */}
      {!loading && !error && data && (
        <>
          {view === "overall" ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <MetricCard
                  label="세션"
                  value={data.summary.sessions.value.toLocaleString("ko-KR")}
                  change={data.summary.sessions.change}
                />
                <MetricCard
                  label="사용자"
                  value={data.summary.users.value.toLocaleString("ko-KR")}
                  change={data.summary.users.change}
                />
                <MetricCard
                  label="페이지뷰"
                  value={data.summary.pageviews.value.toLocaleString("ko-KR")}
                  change={data.summary.pageviews.change}
                />
                <MetricCard
                  label="평균 체류"
                  value={formatDuration(data.summary.avgDuration.value)}
                  change={data.summary.avgDuration.change}
                />
                <MetricCard
                  label="이탈률"
                  value={`${data.summary.bounceRate.value.toFixed(1)}%`}
                  change={data.summary.bounceRate.change}
                  invertChange={true}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="주요 페이지·섹션">
                  <TopPagesChart
                    data={data.topPages}
                    selectedPath={activeTopPage}
                    onSelect={setSelectedTopPage}
                  />
                <p className="mt-3 text-xs text-[var(--muted)]">
                    블로그, 치료 페이지, 리서치는 전체 섹션 단위로 먼저 묶은 뒤 비교합니다. 막대를 누르면 상세가 열립니다.
                  </p>
                </SectionCard>

                <SectionCard title="유입 경로">
                  <TrafficSourceChart
                    data={data.trafficSources}
                    selectedSource={activeSource}
                    onSelect={setSelectedSource}
                  />
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    파이차트의 해당 조각을 누르면 유입경로 상세가 열립니다.
                  </p>
                </SectionCard>

                <SectionCard title="기기별 접속">
                  <DeviceChart data={data.devices} />
                </SectionCard>

                <SectionCard title="일별 방문자 추이">
                  <DailyTrendChart data={data.dailyTrend} />
                </SectionCard>

                <SectionCard title="지역별 유입 TOP 10">
                  <CityChart data={data.cities} />
                </SectionCard>

                <SectionCard title="신규 vs 재방문">
                  <NewVsReturningChart data={data.newVsReturning} />
                </SectionCard>

                <SectionCard title="시간대별 방문 패턴">
                  <HourlyPatternChart data={data.hourlyPattern} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    가장 많이 방문하는 시간대가 골드 색으로 표시됩니다.
                  </p>
                </SectionCard>

                <SectionCard title="요일별 방문 패턴">
                  <DowPatternChart data={data.dowPattern} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    가장 많이 방문하는 요일이 골드 색으로 표시됩니다.
                  </p>
                </SectionCard>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="추적 글 수"
                  value={activeBlogPosts.toLocaleString("ko-KR")}
                  loading={blogGa4Loading && activeBlogPosts === 0}
                />
                <MetricCard
                  label="평균 체류"
                  value={blogSummary.avgDuration > 0 ? formatDuration(blogSummary.avgDuration) : "—"}
                  loading={blogGa4Loading && blogSummary.avgDuration === 0}
                />
                <MetricCard
                  label="세션 수"
                  value={blogAggregateDetail?.summary.sessions.toLocaleString("ko-KR") ?? "—"}
                />
                <MetricCard
                  label="페이지뷰"
                  value={blogSummary.pageViews.toLocaleString("ko-KR")}
                  loading={blogGa4Loading && blogSummary.pageViews === 0}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label={`${period === "30d" ? "30일" : period === "90d" ? "90일" : "180일"} 공유 시도`}
                  value={conversionData?.configured ? conversionData.summary.totalShareActions.toLocaleString("ko-KR") : "설정 필요"}
                  color="text-sky-700"
                  loading={conversionLoading}
                />
                <MetricCard
                  label={`${period === "30d" ? "30일" : period === "90d" ? "90일" : "180일"} 공유 유입`}
                  value={conversionData?.configured ? conversionData.summary.totalShareVisits.toLocaleString("ko-KR") : "설정 필요"}
                  color="text-violet-700"
                  loading={conversionLoading}
                />
                <MetricCard
                  label="공유 유입률"
                  value={
                    conversionData?.configured
                      ? conversionData.summary.shareVisitRate === null
                        ? "—"
                        : `${conversionData.summary.shareVisitRate}%`
                      : "설정 필요"
                  }
                  color="text-emerald-700"
                  loading={conversionLoading}
                />
                <MetricCard
                  label="네이티브/복사"
                  value={
                    conversionData?.configured
                      ? `${conversionData.summary.nativeShareActions}/${conversionData.summary.copyShareActions}`
                      : "설정 필요"
                  }
                  color="text-[var(--color-gold-dark)]"
                  loading={conversionLoading}
                />
              </div>

              {blogGa4Error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  블로그 평균 체류 집계 일부를 불러오지 못했습니다. 글별 조회와 드릴다운은 계속 볼 수 있습니다.
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard title="오래 읽힌 글">
                  <div className="space-y-2">
                    {longestReadPosts.length > 0 ? longestReadPosts.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setSelectedTopPage(item.path)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
                      >
                        <div className="min-w-0 pr-3">
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                          >
                            {blogTitleMap.get(getBlogSlugFromPath(item.path) ?? "") ?? item.path}
                          </a>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            평균 체류 {formatDuration(item.avgDuration)} · 페이지뷰 {item.pageViews.toLocaleString("ko-KR")}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
                            {item.path}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-emerald-600">상세 보기</span>
                      </button>
                    )) : (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">
                        표시할 체류 데이터가 없습니다.
                      </p>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="짧게 보고 나간 글">
                  <div className="space-y-2">
                    {shortestReadPosts.length > 0 ? shortestReadPosts.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setSelectedTopPage(item.path)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
                      >
                        <div className="min-w-0 pr-3">
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                          >
                            {blogTitleMap.get(getBlogSlugFromPath(item.path) ?? "") ?? item.path}
                          </a>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            평균 체류 {formatDuration(item.avgDuration)} · 페이지뷰 {item.pageViews.toLocaleString("ko-KR")}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
                            {item.path}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-amber-600">상세 보기</span>
                      </button>
                    )) : (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">
                        표시할 체류 데이터가 없습니다.
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>

              <SectionCard title="글별 방문 성과">
                <>
                  <div className="space-y-2 sm:hidden">
                    <div className="flex items-center gap-2 pb-1 text-xs text-[var(--muted)]">
                      <span>정렬:</span>
                      {(["sessions", "views", "avgDuration"] as const).map((k) => {
                        const labels = { sessions: "세션수", views: "페이지뷰", avgDuration: "평균체류" };
                        const active = blogSortKey === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleBlogSort(k)}
                            className={`rounded-full px-2 py-0.5 transition-colors ${active ? "bg-[var(--color-primary)] text-white" : "bg-[var(--border)] text-[var(--foreground)] hover:bg-[var(--color-primary)]/20"}`}
                          >
                            {labels[k]}{active ? (blogSortDir === "desc" ? " ▼" : " ▲") : ""}
                          </button>
                        );
                      })}
                    </div>
                    {blogPerformanceRows.length > 0 ? blogPerformanceRows.map((item) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setSelectedTopPage(item.path)}
                        className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
                      >
                        <div className="min-w-0 pr-3">
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                          >
                            {blogTitleMap.get(getBlogSlugFromPath(item.path) ?? "") ?? item.path}
                          </a>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            세션 {item.sessions.toLocaleString("ko-KR")} · 페이지뷰 {item.views.toLocaleString("ko-KR")} · 평균 체류 {item.avgDuration > 0 ? formatDuration(item.avgDuration) : "—"}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[var(--muted)]">{item.path}</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-[var(--color-primary)]">
                          상세 보기
                        </span>
                      </button>
                    )) : (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">
                        블로그 방문 성과 데이터가 없습니다.
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:block">
                    <DataTable
                      keyField="path"
                      rows={blogPerformanceRows as unknown as Record<string, unknown>[]}
                      sortKey={blogSortKey}
                      sortDirection={blogSortDir}
                      onSort={handleBlogSort}
                      columns={[
                        {
                          key: "path",
                          label: "글",
                          align: "left",
                          render: (row) => {
                            const path = String((row as { path: string }).path);
                            return (
                              <div className="min-w-0">
                                <a
                                  href={path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="block max-w-[280px] truncate text-left font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                                  title={path}
                                >
                                  {blogTitleMap.get(getBlogSlugFromPath(path) ?? "") ?? path}
                                </a>
                                <p className="mt-1 block max-w-[280px] truncate text-left text-[11px] text-[var(--muted)]" title={path}>
                                  {path}
                                </p>
                              </div>
                            );
                          },
                        },
                        {
                          key: "sessions",
                          label: "세션 수",
                          align: "right",
                          sortable: true,
                          render: (row) => Number((row as { sessions: number }).sessions).toLocaleString("ko-KR"),
                        },
                        {
                          key: "views",
                          label: "페이지뷰",
                          align: "right",
                          sortable: true,
                          render: (row) => Number((row as { views: number }).views).toLocaleString("ko-KR"),
                        },
                        {
                          key: "avgDuration",
                          label: "평균 체류",
                          align: "right",
                          sortable: true,
                          render: (row) => {
                            const avgDuration = Number((row as { avgDuration: number }).avgDuration);
                            return avgDuration > 0 ? formatDuration(avgDuration) : "—";
                          },
                        },
                        {
                          key: "detail",
                          label: "",
                          align: "right",
                          render: (row) => {
                            const path = String((row as { path: string }).path);
                            return (
                              <button
                                type="button"
                                onClick={() => setSelectedTopPage(path)}
                                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                              >
                                상세 보기
                              </button>
                            );
                          },
                        },
                      ]}
                      emptyMessage="블로그 방문 성과 데이터가 없습니다."
                    />
                  </div>
                </>
              </SectionCard>

              <SectionCard title="유입 구조">
                <div className="space-y-2">
                  {blogSourceShare.length > 0 ? blogSourceShare.map((item) => (
                    <div
                      key={item.source}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
                    >
                      <span className="truncate pr-3 font-medium text-[var(--foreground)]">{item.source}</span>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {item.sessions.toLocaleString("ko-KR")}세션 · {item.percentage}%
                      </span>
                    </div>
                  )) : (
                    <p className="py-8 text-center text-sm text-[var(--muted)]">
                      표시할 유입 구조 데이터가 없습니다.
                    </p>
                  )}
                </div>
              </SectionCard>
            </>
          )}
        </>
      )}

      {view === "overall" && activeSource && activeSourceDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeSource} 유입경로 상세`}
          onClick={() => setSelectedSource(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] bg-white p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-[var(--foreground)]">
                  {activeSource} 상세
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  검색어는 직접 알 수 없지만, 어떤 페이지로 얼마나 질 좋게 유입되는지는 바로 볼 수 있습니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  세션 {activeSourceDetail.summary.sessions.toLocaleString("ko-KR")}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSource(null)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard
                label="참여 세션"
                value={activeSourceDetail.summary.engagedSessions.toLocaleString("ko-KR")}
              />
              <MetricCard
                label="참여율"
                value={`${activeSourceDetail.summary.engagementRate.toFixed(1)}%`}
              />
              <MetricCard
                label="평균 체류"
                value={formatDuration(activeSourceDetail.summary.avgDuration)}
              />
              <MetricCard
                label="세션당 페이지뷰"
                value={activeSourceDetail.summary.pageviewsPerSession.toFixed(2)}
              />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl bg-[var(--surface)] p-4">
                <h5 className="text-sm font-semibold text-[var(--foreground)]">
                  이 유입의 랜딩 페이지 TOP
                </h5>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  어떤 페이지가 해당 유입을 실제로 받고 있는지 봅니다.
                </p>
                <div className="mt-3">
                  <TopPagesChart data={activeSourceDetail.topLandingPages} />
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface)] p-4">
                <h5 className="text-sm font-semibold text-[var(--foreground)]">
                  이 유입의 기간별 추이
                </h5>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  최근 들어 늘고 있는 유입인지 빠르게 확인할 수 있습니다.
                </p>
                <div className="mt-3">
                  <DailyTrendChart data={activeSourceDetail.dailyTrend} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTopPage && activeTopPageDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${activeTopPage} 상세`}
          onClick={() => setSelectedTopPage(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] bg-white p-4 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-[var(--foreground)]">
                  {activeTopPageTitle}
                </h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {activeTopPageDetail.isBlogAggregate
                    ? "블로그 전체 유입을 묶어서 보여줍니다."
                    : activeTopPageDetail.isSectionAggregate
                      ? `${activeTopPageDetail.aggregateLabel ?? "섹션"} 유입을 묶어서 보여줍니다.`
                      : "해당 페이지 단위의 세부 데이터를 보여줍니다."}
                </p>
                {!activeTopPageDetail.isSectionAggregate && (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{activeTopPage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopPage(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              <MetricCard
                label="페이지뷰"
                value={activeTopPageDetail.summary.views.toLocaleString("ko-KR")}
              />
              <MetricCard
                label="평균 체류"
                value={activeTopPageDuration > 0 ? formatDuration(activeTopPageDuration) : "—"}
              />
              <MetricCard
                label="읽힘 비교"
                value={activeTopPageDuration > 0 ? formatDurationDelta(activeTopPageDuration, blogSummary.avgDuration) : "—"}
              />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl bg-[var(--surface)] p-4">
                <h5 className="text-sm font-semibold text-[var(--foreground)]">
                  최근 추이
                </h5>
                <div className="mt-3">
                  <DailyTrendChart data={activeTopPageDetail.dailyTrend} />
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface)] p-4">
                <h5 className="text-sm font-semibold text-[var(--foreground)]">
                  주요 유입경로
                </h5>
                <div className="mt-3 space-y-2">
                  {activeTopPageDetail.sources.length > 0 ? activeTopPageDetail.sources.map((item) => (
                    <div
                      key={item.source}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                    >
                      <span className="truncate pr-3 font-medium text-[var(--foreground)]">{item.source}</span>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {item.sessions.toLocaleString("ko-KR")}세션 · {item.percentage}%
                      </span>
                    </div>
                  )) : (
                    <p className="text-sm text-[var(--muted)]">표시할 유입경로 데이터가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {activeTopPageDetail.isSectionAggregate && activeTopPageDetail.topChildPages.length > 0 && (
              <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4">
                <h5 className="text-sm font-semibold text-[var(--foreground)]">
                  {activeTopPageDetail.isBlogAggregate
                    ? "블로그에서 많이 본 글"
                    : activeTopPageDetail.aggregateLabel === "치료 페이지 전체"
                      ? "치료 페이지에서 많이 본 상세 페이지"
                      : "리서치에서 많이 본 상세 페이지"}
                </h5>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {activeTopPageDetail.isBlogAggregate
                    ? "블로그 전체 안에서 실제 조회를 만든 개별 글입니다. 막대를 누르면 그 글 상세로 이동합니다."
                    : activeTopPageDetail.aggregateLabel === "치료 페이지 전체"
                      ? "치료 페이지 전체 안에서 실제 조회를 만든 개별 페이지입니다. 막대를 누르면 그 페이지 상세로 이동합니다."
                      : "리서치 전체 안에서 실제 조회를 만든 개별 페이지입니다. 막대를 누르면 그 페이지 상세로 이동합니다."}
                </p>
                <div className="mt-3">
                  <TopPagesChart
                    data={activeTopPageDetail.topChildPages}
                    selectedPath={activeTopPage}
                    onSelect={setSelectedTopPage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
