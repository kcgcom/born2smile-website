"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Search, ShieldAlert } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { useAdminApi } from "./useAdminApi";
import type {
  IndexingMonitorData,
  IndexMonitorStatus,
  IndexStatusItem,
} from "@/lib/admin-indexing-monitor";

type Filter = "attention" | "all" | IndexMonitorStatus;

const STATUS_COPY: Record<IndexMonitorStatus, { label: string; className: string }> = {
  unchecked: { label: "검사 대기", className: "bg-slate-100 text-slate-700" },
  indexed: { label: "색인됨", className: "bg-emerald-50 text-emerald-700" },
  discovered: { label: "발견됨", className: "bg-blue-50 text-blue-700" },
  "crawled-not-indexed": { label: "크롤링 후 미색인", className: "bg-amber-50 text-amber-800" },
  unknown: { label: "Google에 알려지지 않음", className: "bg-orange-50 text-orange-700" },
  excluded: { label: "기타 미색인", className: "bg-red-50 text-red-700" },
  failed: { label: "검사 실패", className: "bg-red-50 text-red-700" },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function effectiveStatus(item: IndexStatusItem): IndexMonitorStatus {
  return item.error ? "failed" : item.status;
}

function formatRunStatus(status: string): string {
  if (status === "completed") return "완료";
  if (status === "completed_with_errors") return "일부 실패";
  if (status === "failed") return "실패";
  if (status === "running") return "진행 중";
  return status;
}

function needsAttention(item: IndexStatusItem) {
  const status = effectiveStatus(item);
  return item.canonicalMismatch || (status !== "indexed" && status !== "unchecked");
}

export function IndexingStatusTab() {
  const [filter, setFilter] = useState<Filter>("attention");
  const [query, setQuery] = useState("");
  const { data, loading, error, refetch } = useAdminApi<IndexingMonitorData>("/api/admin/indexing-status");

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.items ?? []).filter((item) => {
      const status = effectiveStatus(item);
      const statusMatch = filter === "all"
        || (filter === "attention" ? needsAttention(item) : status === filter);
      const queryMatch = !needle || item.url.toLowerCase().includes(needle);
      return statusMatch && queryMatch;
    });
  }, [data?.items, filter, query]);

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["searchConsole"]} />

      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {!loading && !error && data && (
        <>
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <AdminPill tone="white">URL Inspection</AdminPill>
                  <AdminPill tone={data.summary.needsAttention > 0 ? "warning" : "white"}>
                    확인 필요 {data.summary.needsAttention}개
                  </AdminPill>
                  {data.summary.pendingChanges > 0 && (
                    <AdminPill tone="sky">변경 확인 중 {data.summary.pendingChanges}개</AdminPill>
                  )}
                </div>
                <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">
                  중요한 페이지의 색인 변화를 순환 점검합니다.
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  신규·문제 URL을 우선하고, 사이트 규모에 맞춰 하루 50~200개를 검사해 30일 순환을 목표로 합니다.
                </p>
                {data.lastRun && (
                  <div className="mt-2 text-xs text-[var(--muted-light)]">
                    <p>
                      최근 작업 {formatRunStatus(data.lastRun.status)}
                      {" · "}성공 {data.lastRun.succeeded}개 / 실패 {data.lastRun.failed}개
                      {data.lastRun.completedAt ? ` · ${formatDate(data.lastRun.completedAt)}` : ""}
                    </p>
                    {data.lastRun.error && <p className="mt-1 text-red-600">{data.lastRun.error}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <p className="mt-2 text-xs text-emerald-700">색인됨</p>
                  <p className="mt-1 text-xl font-bold text-emerald-900">{data.summary.indexed}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <p className="mt-2 text-xs text-amber-700">확인 필요</p>
                  <p className="mt-1 text-xl font-bold text-amber-900">{data.summary.needsAttention}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <Clock3 className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  <p className="mt-2 text-xs text-slate-600">검사 대기</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.unchecked}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4">
                  <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />
                  <p className="mt-2 text-xs text-red-700">검사 실패</p>
                  <p className="mt-1 text-xl font-bold text-red-900">{data.summary.failed}</p>
                </div>
              </div>
            </div>
          </AdminSurface>

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {([
                  ["attention", "확인 필요"],
                  ["unchecked", "검사 대기"],
                  ["indexed", "색인됨"],
                  ["all", "전체"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === value
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="relative block lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
                <span className="sr-only">URL 검색</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="URL 검색"
                  className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </label>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                    <th className="px-3 py-3 font-medium">URL</th>
                    <th className="px-3 py-3 font-medium">상태</th>
                    <th className="px-3 py-3 font-medium">세부 사유</th>
                    <th className="px-3 py-3 font-medium">마지막 크롤링</th>
                    <th className="px-3 py-3 font-medium">검사 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const status = effectiveStatus(item);
                    const copy = STATUS_COPY[status];
                    return (
                      <tr key={item.url} className="border-b border-[var(--border)]/70 align-top">
                        <td className="max-w-[360px] px-3 py-3">
                          <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-[var(--foreground)] hover:text-[var(--color-primary)]">
                            {item.path}
                          </a>
                          {item.canonicalMismatch && <p className="mt-1 text-xs text-red-600">Google canonical 불일치</p>}
                          {item.pendingCount > 0 && <p className="mt-1 text-xs text-blue-600">상태 변경 확인 중</p>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${copy.className}`}>{copy.label}</span>
                        </td>
                        <td className="max-w-[260px] px-3 py-3 text-xs text-[var(--muted)]">
                          {item.error ?? item.coverageState ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatDate(item.lastCrawlTime)}</td>
                        <td className="px-3 py-3 text-xs text-[var(--muted)]">{formatDate(item.inspectedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <p className="py-12 text-center text-sm text-[var(--muted)]">조건에 맞는 URL이 없습니다.</p>
              )}
            </div>
          </AdminSurface>

          {data.events.length > 0 && (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                  확정된 상태 변경 {data.events.length}건
                </summary>
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {data.events.map((event) => (
                    <li key={event.id} className="py-3 text-sm">
                      <p className="break-all font-medium text-[var(--foreground)]">{event.url}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {event.fromStatus ?? "초기 상태"} → {event.toStatus} · {formatDate(event.observedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            </AdminSurface>
          )}
        </>
      )}
    </div>
  );
}
