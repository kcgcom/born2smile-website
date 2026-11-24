"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";
import type { SiteHours } from "@/lib/site-config-supabase";
import { AdminErrorState } from "../AdminErrorState";
import { LoadingPlaceholder } from "../shared";
import { useAdminApi } from "../useAdminApi";

export function HoursScheduleSummary({ hours }: { hours: SiteHours }) {
  return (
    <div className="space-y-2 rounded-xl bg-[var(--background)]/72 p-3">
      <div className="space-y-2">
        {hours.schedule.map((row) => (
          <div key={row.day} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0 text-[var(--foreground)]">
              {row.day}
              {row.note && <span className="ml-1 text-xs text-[var(--muted)]">({row.note})</span>}
            </div>
            <div className={row.open ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>{row.open ? row.time : "휴진"}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] pt-2 text-sm text-[var(--muted)]">
        점심시간 {hours.lunchTime || "미설정"} · {hours.closedDays || "휴진일 미설정"}
        {hours.notice && <span className="block pt-1">{hours.notice}</span>}
      </div>
    </div>
  );
}

export function HoursSummaryCard() {
  const { data, loading, error, refetch } = useAdminApi<SiteHours>("/api/admin/site-config/hours");

  return (
    <AdminSurface tone="white" role="region" aria-label="진료시간" className="space-y-3 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-bold">진료시간</h3>
      {loading && !data && <LoadingPlaceholder />}
      {(error || (!loading && !data)) && (
        <AdminErrorState message={`진료시간 조회 실패: ${error ?? "설정 데이터를 불러올 수 없습니다."}`} onRetry={refetch} />
      )}
      {data && <HoursScheduleSummary hours={data} />}
    </AdminSurface>
  );
}
