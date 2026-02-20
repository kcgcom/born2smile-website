"use client";

import { useState } from "react";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";

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
// Skeleton loader
// ---------------------------------------------------------------

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-3 text-center">
            <div className="mx-auto h-8 w-16 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mt-2 h-3 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

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
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf} (2~3일 지연)
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm font-medium text-red-700 underline underline-offset-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && <Skeleton />}

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
            {/* Position: lower number = better rank, so invert the change sign */}
            <MetricCard
              label="평균 순위"
              value={data.summary.position.value}
              change={
                data.summary.position.change !== null
                  ? Math.round(data.summary.position.change * -10) / 10
                  : null
              }
            />
          </div>

          {/* Top queries */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              상위 검색 키워드
            </h3>
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
    </div>
  );
}
