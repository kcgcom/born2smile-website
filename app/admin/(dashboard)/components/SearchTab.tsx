"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";

// ---------------------------------------------------------------
// Recharts keyword chart — loaded client-side only
// ---------------------------------------------------------------

type KeywordChartItem = {
  query: string;
  impressions: number;
  clicks: number;
};

const KeywordBarChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data }: { data: KeywordChartItem[] }) {
        const truncate = (s: string, n = 10) =>
          s.length > n ? s.slice(0, n) + "…" : s;
        const chartData = data.slice(0, 10).map((d) => ({
          ...d,
          label: truncate(d.query),
        }));
        return (
          <mod.ResponsiveContainer width="100%" height={300}>
            <mod.BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 52 }}
            >
              <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <mod.XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <mod.YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={44} />
              <mod.Tooltip
                formatter={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ((value: number, name: string) => [value.toLocaleString("ko-KR"), name === "impressions" ? "노출" : "클릭"]) as any
                }
                labelFormatter={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ((label: string) => { const item = chartData.find((d) => d.label === label); return item?.query ?? label; }) as any
                }
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend
                formatter={(value) =>
                  value === "impressions" ? "노출" : "클릭"
                }
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <mod.Bar
                dataKey="impressions"
                name="impressions"
                fill="#2563EB"
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
              <mod.Bar
                dataKey="clicks"
                name="clicks"
                fill="#C9962B"
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
            </mod.BarChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Recharts Naver trend line chart — loaded client-side only
// ---------------------------------------------------------------

const NAVER_GROUP_COLORS: Record<string, string> = {
  "임플란트": "#2563EB",
  "치아교정": "#C9962B",
  "보철·보존": "#16A34A",
  "소아치과": "#9333EA",
  "예방·건강": "#0891B2",
};

interface NaverTrendChartProps {
  groups: Array<{
    title: string;
    data: Array<{ period: string; ratio: number }>;
  }>;
}

const NaverTrendLineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ groups }: NaverTrendChartProps) {
        // Merge all groups into a single data array keyed by period
        const periodMap = new Map<string, Record<string, number | string>>();
        for (const group of groups) {
          for (const d of group.data) {
            const key = d.period;
            if (!periodMap.has(key)) periodMap.set(key, { period: key });
            periodMap.get(key)![group.title] = d.ratio;
          }
        }
        const chartData = Array.from(periodMap.values()).sort((a, b) =>
          String(a.period).localeCompare(String(b.period)),
        );

        const formatDate = (value: string) => {
          if (!value) return "";
          // "2026-02-15" → "2/15"
          const parts = value.split("-");
          return `${Number(parts[1])}/${Number(parts[2])}`;
        };

        return (
          <mod.ResponsiveContainer width="100%" height={300}>
            <mod.LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <mod.XAxis
                dataKey="period"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                interval="preserveStartEnd"
              />
              <mod.YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                width={36}
                domain={[0, 100]}
              />
              <mod.Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={((label: string) => label) as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [value, name]) as any}
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {groups.map((g) => (
                <mod.Line
                  key={g.title}
                  type="monotone"
                  dataKey={g.title}
                  name={g.title}
                  stroke={NAVER_GROUP_COLORS[g.title] ?? "#6B7280"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </mod.LineChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface MetricValue {
  value: number;
  change: number | null;
}

interface NaverDatalabData {
  period: { start: string; end: string };
  timeUnit: string;
  groups: Array<{
    title: string;
    data: Array<{ period: string; ratio: number }>;
  }>;
}

interface SearchConsoleData {
  dataAsOf: string;
  period: { start: string; end: string };
  comparePeriod: { start: string; end: string };
  summary: {
    impressions: MetricValue;
    clicks: MetricValue;
    ctr: MetricValue;
    position: MetricValue;
  };
  topQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  blogPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
}

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const PERIODS = [
  { value: "7d", label: "7일" },
  { value: "28d", label: "28일" },
  { value: "90d", label: "3개월" },
];

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function SearchTab() {
  const [period, setPeriod] = useState<"7d" | "28d" | "90d">("28d");

  const { data, loading, error, refetch } = useAdminApi<SearchConsoleData>(
    `/api/admin/search-console?period=${period}`,
  );

  const { data: naverData, loading: naverLoading, error: naverError, refetch: naverRefetch } =
    useAdminApi<NaverDatalabData | null>(`/api/admin/naver-datalab?period=${period}`);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "7d" | "28d" | "90d");
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector periods={PERIODS} selected={period} onChange={handlePeriodChange} />
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf} (2~3일 지연)
          </span>
        )}
      </div>

      {/* Error state */}
      {error && <AdminErrorState message={error} onRetry={refetch} />}

      {/* Loading state */}
      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {/* Data */}
      {!loading && !error && data && (
        <>
          {/* Summary metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="총 노출"
              value={data.summary.impressions.value.toLocaleString("ko-KR")}
              change={data.summary.impressions.change}
            />
            <MetricCard
              label="총 클릭"
              value={data.summary.clicks.value.toLocaleString("ko-KR")}
              change={data.summary.clicks.change}
            />
            <MetricCard
              label="평균 CTR"
              value={`${data.summary.ctr.value}%`}
              change={data.summary.ctr.change}
            />
            {/* Position: lower number = better rank, so invert change color */}
            <MetricCard
              label="평균 순위"
              value={data.summary.position.value}
              change={data.summary.position.change}
              invertChange={true}
            />
          </div>

          {/* Top queries — chart + table */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              상위 검색 키워드
            </h3>
            {data.topQueries.length > 0 && (
              <div className="mb-4 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <KeywordBarChart data={data.topQueries} />
              </div>
            )}
            <DataTable
              columns={[
                { key: "query", label: "키워드", align: "left" },
                { key: "impressions", label: "노출", align: "right" },
                { key: "clicks", label: "클릭", align: "right" },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  render: (row) => `${(row as { ctr: number }).ctr}%`,
                },
                { key: "position", label: "순위", align: "right" },
              ]}
              rows={data.topQueries as unknown as Record<string, unknown>[]}
              keyField="query"
              emptyMessage="검색 키워드 데이터가 없습니다"
            />
          </section>

          {/* Top pages */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              상위 페이지별 검색 성과
            </h3>
            <DataTable
              columns={[
                {
                  key: "page",
                  label: "페이지",
                  align: "left",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    return (
                      <span
                        className="block max-w-[200px] truncate sm:max-w-xs"
                        title={page}
                      >
                        {page}
                      </span>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right" },
                { key: "clicks", label: "클릭", align: "right" },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  render: (row) => `${(row as { ctr: number }).ctr}%`,
                },
                { key: "position", label: "순위", align: "right" },
              ]}
              rows={data.topPages as unknown as Record<string, unknown>[]}
              keyField="page"
              emptyMessage="페이지 데이터가 없습니다"
            />
          </section>

          {/* Blog pages */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              블로그 포스트 검색 성과
            </h3>
            <DataTable
              columns={[
                {
                  key: "page",
                  label: "페이지",
                  align: "left",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    return (
                      <span
                        className="block max-w-[200px] truncate sm:max-w-xs"
                        title={page}
                      >
                        {page}
                      </span>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right" },
                { key: "clicks", label: "클릭", align: "right" },
                { key: "position", label: "순위", align: "right" },
              ]}
              rows={data.blogPages as unknown as Record<string, unknown>[]}
              keyField="page"
              emptyMessage="블로그 검색 데이터가 없습니다"
            />
          </section>
        </>
      )}

      {/* ───────────── Naver DataLab Trend ───────────── */}
      {naverData && (
        <>
          <hr className="border-[var(--border)]" />
          <section>
            <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
              네이버 검색 트렌드
            </h3>
            <p className="mb-3 text-xs text-[var(--muted)]">
              치과 관련 키워드의 네이버 상대 검색량 추이 (100 = 기간 내 최대)
            </p>
            <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
              <NaverTrendLineChart groups={naverData.groups} />
            </div>
          </section>
        </>
      )}

      {naverError && !naverLoading && (
        <section>
          <hr className="border-[var(--border)]" />
          <div className="mt-6">
            <AdminErrorState message={`네이버 트렌드: ${naverError}`} onRetry={naverRefetch} />
          </div>
        </section>
      )}

      {naverLoading && !naverData && (
        <section>
          <hr className="my-6 border-[var(--border)]" />
          <AdminLoadingSkeleton variant="chart" />
        </section>
      )}
    </div>
  );
}
