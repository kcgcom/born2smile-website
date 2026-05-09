"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { formatDuration } from "./insight/shared";
import type { MetricValue } from "./insight/shared";

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

type Period = "30d" | "90d" | "180d";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "30d", label: "1개월" },
  { value: "90d", label: "3개월" },
  { value: "180d", label: "6개월" },
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
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminApi<AnalyticsData>(
    `/api/admin/analytics?period=${period}`,
  );
  const sourceDetails = data?.sourceDetails ?? {};

  const activeSource = selectedSource && sourceDetails[selectedSource]
    ? selectedSource
    : (data?.trafficSources[0]?.source ?? null);
  const activeSourceDetail = activeSource ? sourceDetails[activeSource] : null;

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
              <TrafficSourceChart
                data={data.trafficSources}
                selectedSource={activeSource}
                onSelect={setSelectedSource}
              />
              <div className="mt-4 grid gap-2">
                {data.trafficSources.map((item) => {
                  const active = item.source === activeSource;
                  return (
                    <button
                      key={item.source}
                      type="button"
                      onClick={() => setSelectedSource(item.source)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "border-[var(--color-primary)] bg-blue-50 text-[var(--foreground)]"
                          : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--color-primary)]/40"
                      }`}
                    >
                      <span className="truncate pr-3 font-medium">{item.source}</span>
                      <span className="shrink-0 text-xs">
                        {item.sessions.toLocaleString("ko-KR")}세션 · {item.percentage}%
                      </span>
                    </button>
                  );
                })}
              </div>
              {activeSource && activeSourceDetail && (
                <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {activeSource} 상세
                      </h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        검색어는 직접 알 수 없지만, 어떤 페이지로 얼마나 질 좋게 유입되는지는 바로 볼 수 있습니다.
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      세션 {activeSourceDetail.summary.sessions.toLocaleString("ko-KR")}
                    </span>
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

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                    <div className="rounded-2xl bg-[var(--surface)] p-4">
                      <h5 className="text-sm font-semibold text-[var(--foreground)]">
                        유입 해석 메모
                      </h5>
                      <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                        <li>이탈률: {activeSourceDetail.summary.bounceRate.toFixed(1)}%</li>
                        <li>참여율이 높고 랜딩 페이지가 명확하면 운영 액션으로 이어지기 좋습니다.</li>
                        <li>검색어는 확인이 어려워도, 어떤 페이지가 네이버/구글 유입을 먹는지는 판단할 수 있습니다.</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-[var(--surface)] p-4">
                      <h5 className="text-sm font-semibold text-[var(--foreground)]">
                        기기 분포
                      </h5>
                      <div className="mt-3">
                        <DeviceChart data={activeSourceDetail.devices} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Devices */}
            <SectionCard title="기기별 접속">
              <DeviceChart data={data.devices} />
            </SectionCard>

            {/* Daily trend */}
            <SectionCard title="일별 방문자 추이">
              <DailyTrendChart data={data.dailyTrend} />
            </SectionCard>

            {/* City */}
            <SectionCard title="지역별 유입 TOP 10">
              <CityChart data={data.cities} />
            </SectionCard>

            {/* New vs Returning */}
            <SectionCard title="신규 vs 재방문">
              <NewVsReturningChart data={data.newVsReturning} />
            </SectionCard>

            {/* Hourly pattern */}
            <SectionCard title="시간대별 방문 패턴">
              <HourlyPatternChart data={data.hourlyPattern} />
              <p className="mt-2 text-xs text-[var(--muted)]">가장 많이 방문하는 시간대가 골드 색으로 표시됩니다.</p>
            </SectionCard>

            {/* Day of week pattern */}
            <SectionCard title="요일별 방문 패턴">
              <DowPatternChart data={data.dowPattern} />
              <p className="mt-2 text-xs text-[var(--muted)]">가장 많이 방문하는 요일이 골드 색으로 표시됩니다.</p>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
