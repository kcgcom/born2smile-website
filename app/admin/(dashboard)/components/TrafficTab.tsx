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

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* metric cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-gray-50 p-3 text-center">
            <Skeleton className="mx-auto h-8 w-16" />
            <Skeleton className="mx-auto mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      {/* charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <Skeleton className="mb-4 h-5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function BarRow({
  label,
  percentage,
  count,
}: {
  label: string;
  percentage: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm">
      <span className="w-28 shrink-0 truncate text-[var(--foreground)]">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-[var(--muted)]">
        {count.toLocaleString("ko-KR")}
      </span>
      <span className="w-10 shrink-0 text-right text-xs text-[var(--muted)]">
        {percentage}%
      </span>
    </div>
  );
}

function DailyTrendChart({
  data,
}: {
  data: Array<{ date: string; sessions: number; pageviews: number }>;
}) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>
    );
  }

  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-0 items-end gap-1" style={{ minHeight: "100px" }}>
        {data.map((d) => {
          const heightPct = Math.round((d.sessions / maxSessions) * 100);
          const label = d.date.length === 10 ? d.date.slice(5).replace("-", ".") : d.date;
          return (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-[var(--muted)]">
                {d.sessions.toLocaleString("ko-KR")}
              </span>
              <div className="w-full rounded-t bg-[var(--color-primary)] opacity-80 transition-all"
                style={{ height: `${Math.max(heightPct, 2)}px` }}
              />
              <span className="text-[10px] text-[var(--muted)]">{label}</span>
            </div>
          );
        })}
      </div>
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
      <div className="flex justify-end">
        <PeriodSelector
          periods={PERIODS}
          selected={period}
          onChange={(v) => setPeriod(v as Period)}
        />
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl bg-[var(--surface)] px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={refetch}
            className="mt-4 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && (
        <>
          {/* Data as of notice */}
          <p className="text-right text-xs text-[var(--muted)]">
            기준일: {data.dataAsOf}
          </p>

          {/* Summary metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          </div>

          {/* 2x2 grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top pages */}
            <SectionCard title="인기 페이지 TOP 10">
              <DataTable
                columns={[
                  { key: "path", label: "페이지", align: "left" },
                  { key: "views", label: "조회수", align: "right",
                    render: (row) => (row.views as number).toLocaleString("ko-KR") },
                  { key: "sessions", label: "세션수", align: "right",
                    render: (row) => (row.sessions as number).toLocaleString("ko-KR") },
                ]}
                rows={data.topPages as unknown as Record<string, unknown>[]}
                keyField="path"
                emptyMessage="페이지 데이터가 없습니다"
              />
            </SectionCard>

            {/* Traffic sources */}
            <SectionCard title="유입 경로">
              {data.trafficSources.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {data.trafficSources.map((s) => (
                    <BarRow
                      key={s.source}
                      label={s.source}
                      percentage={s.percentage}
                      count={s.sessions}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Devices */}
            <SectionCard title="기기별 접속">
              {data.devices.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {data.devices.map((d) => (
                    <BarRow
                      key={d.category}
                      label={DEVICE_LABELS[d.category] ?? d.category}
                      percentage={d.percentage}
                      count={d.sessions}
                    />
                  ))}
                </div>
              )}
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
