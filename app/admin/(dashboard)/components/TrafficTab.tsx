"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface MetricValue {
  value: number;
  change: number | null;
}

interface AnalyticsData {
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
  trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
  devices: Array<{ category: string; sessions: number; percentage: number }>;
  dailyTrend: Array<{ date: string; sessions: number; pageviews: number }>;
}

type Period = "7d" | "30d" | "90d";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDateLabel(date: string): string {
  if (date.length === 10) return date.slice(5).replace("-", ".");
  return date;
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
        }: {
          data: Array<{ path: string; views: number; sessions: number }>;
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
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[0]} fillOpacity={0.85} />
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
        }: {
          data: Array<{ source: string; sessions: number; percentage: number }>;
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
                  {data.map((_, idx) => (
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
  const [period, setPeriod] = useState<Period>("7d");

  const { data, loading, error, refetch } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}`,
  );

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS}
          selected={period}
          onChange={(v) => setPeriod(v as Period)}
        />
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf}
          </span>
        )}
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
          {/* Summary metric cards */}
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

          {/* 2×2 grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top pages */}
            <SectionCard title="인기 페이지 TOP 10">
              <TopPagesChart data={data.topPages} />
            </SectionCard>

            {/* Traffic sources */}
            <SectionCard title="유입 경로">
              <TrafficSourceChart data={data.trafficSources} />
            </SectionCard>

            {/* Devices */}
            <SectionCard title="기기별 접속">
              <DeviceChart data={data.devices} />
            </SectionCard>

            {/* Daily trend */}
            <SectionCard title="일별 방문자 추이">
              <DailyTrendChart data={data.dailyTrend} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
