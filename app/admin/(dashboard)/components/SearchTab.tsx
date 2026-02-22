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
// Types
// ---------------------------------------------------------------

interface MetricValue {
  value: number;
  change: number | null;
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

      {/* ───────────── Naver DataLab → 트렌드 탭 ───────────── */}
      <hr className="border-[var(--border)]" />
      <section>
        <div className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              네이버 검색 트렌드
            </h3>
            <p className="text-xs text-[var(--muted)]">
              카테고리별 세부 키워드 트렌드 분석 및 블로그 주제 추천
            </p>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "trend");
              window.history.replaceState(null, "", `?${params.toString()}`);
              window.location.reload();
            }}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            트렌드 탭에서 상세 분석 →
          </button>
        </div>
      </section>
    </div>
  );
}
