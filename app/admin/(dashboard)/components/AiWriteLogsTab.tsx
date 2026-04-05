"use client";

import { Download, Loader2, Search, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi, useAdminMutation } from "./useAdminApi";

interface AiWriteLogsData {
  logs: {
    id: number;
    requested_at: string;
    completed_at: string | null;
    user_email: string;
    mode: "chat" | "generate";
    model: string;
    message_count: number;
    input_chars: number;
    output_bytes: number;
    duration_ms: number | null;
    success: boolean;
    error_code: string | null;
    error_message: string | null;
  }[];
  summary: {
    total: number;
    last24h: number;
    failures24h: number;
    latestRequestedAt: string | null;
    latestSuccess: boolean | null;
    windowDays: number;
  };
}

interface AiWriteLogsCleanupResponse {
  deletedCount: number;
  cutoffIso: string;
  retentionDays: number;
}

type StatusFilter = "all" | "success" | "failed";
type ModeFilter = "all" | "chat" | "generate";
type PeriodFilter = 1 | 7 | 30;

export function AiWriteLogsTab() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [periodDays, setPeriodDays] = useState<PeriodFilter>(30);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AiWriteLogsData["logs"][number] | null>(null);
  const endpoint = `/api/admin/ai-write/logs?limit=100&days=${periodDays}`;

  const {
    data,
    loading,
    error,
    refetch,
  } = useAdminApi<AiWriteLogsData>(endpoint);

  const {
    mutate,
    loading: cleanupLoading,
    error: cleanupError,
    clearError: clearCleanupError,
  } = useAdminMutation<AiWriteLogsCleanupResponse>();

  const filteredLogs = useMemo(() => {
    const raw = data?.logs ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    return raw.filter((log) => {
      if (statusFilter === "success" && !log.success) return false;
      if (statusFilter === "failed" && log.success) return false;
      if (modeFilter !== "all" && log.mode !== modeFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        log.user_email,
        log.model,
        log.error_code ?? "",
        log.error_message ?? "",
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [data?.logs, modeFilter, query, statusFilter]);

  const handleCleanup = async () => {
    clearCleanupError();
    setCleanupMessage(null);
    const result = await mutate("/api/admin/ai-write/logs?days=30", "DELETE");
    if (!result.error && result.data) {
      setCleanupMessage(`${result.data.deletedCount}개의 오래된 로그를 정리했습니다.`);
      refetch();
    }
  };

  const handleCsvDownload = () => {
    if (filteredLogs.length === 0) return;

    const header = [
      "requested_at",
      "user_email",
      "mode",
      "success",
      "error_code",
      "error_message",
      "model",
      "message_count",
      "input_chars",
      "output_bytes",
      "duration_ms",
    ];

    const rows = filteredLogs.map((log) => [
      log.requested_at,
      log.user_email,
      log.mode,
      log.success ? "success" : "failed",
      log.error_code ?? "",
      (log.error_message ?? "").replace(/\n/g, " "),
      log.model,
      String(log.message_count),
      String(log.input_chars),
      String(log.output_bytes),
      log.duration_ms === null ? "" : String(log.duration_ms),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-write-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  if (!data) return null;

  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-semibold text-slate-900">AI 작성 사용 로그</h3>
          </div>
          <p className="text-sm text-slate-600">
            최근 사용 이력과 실패 원인을 검색하고, CSV로 내려받거나 오래된 로그를 정리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminPill tone={data.summary.failures24h > 0 ? "warning" : "white"}>
            최근 24시간 실패 {data.summary.failures24h}건
          </AdminPill>
          <AdminActionButton tone="dark" onClick={handleCsvDownload} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4" />
            CSV 다운로드
          </AdminActionButton>
          <AdminActionButton tone="dark" onClick={handleCleanup} disabled={cleanupLoading}>
            {cleanupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            30일 이전 로그 정리
          </AdminActionButton>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={`최근 ${data.summary.windowDays}일 로그`} value={data.summary.total.toLocaleString("ko-KR")} />
        <SummaryCard label="최근 24시간" value={data.summary.last24h.toLocaleString("ko-KR")} />
        <SummaryCard label="현재 필터 결과" value={filteredLogs.length.toLocaleString("ko-KR")} />
        <SummaryCard
          label="마지막 요청"
          value={data.summary.latestRequestedAt ? formatCompactDate(data.summary.latestRequestedAt) : "—"}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[1, 7, 30].map((days) => {
          const active = periodDays === days;
          return (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days as PeriodFilter)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
              }`}
            >
              최근 {days}일
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이메일, 모델명, 에러 코드 검색"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="all">전체 결과</option>
          <option value="success">성공만</option>
          <option value="failed">실패만</option>
        </select>
        <select
          value={modeFilter}
          onChange={(event) => setModeFilter(event.target.value as ModeFilter)}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
        >
          <option value="all">전체 모드</option>
          <option value="chat">대화</option>
          <option value="generate">초안 생성</option>
        </select>
      </div>

      {cleanupMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {cleanupMessage}
        </div>
      )}
      {cleanupError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {cleanupError}
        </div>
      )}

      <div className="mt-5 space-y-3 md:hidden">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            조건에 맞는 AI 로그가 없습니다.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <button
              key={log.id}
              type="button"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left shadow-sm transition-colors hover:bg-white"
              onClick={() => setSelectedLog(log)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{log.user_email}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatCompactDate(log.requested_at)}</div>
                </div>
                <LogStatusBadge success={log.success} errorCode={log.error_code} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LogModeBadge mode={log.mode} />
                <span className="text-xs text-slate-500">{log.model}</span>
                <span className="text-xs text-slate-500">{log.message_count}개 메시지</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2">
                <CompactLogStat label="입력" value={`${log.input_chars.toLocaleString("ko-KR")}자`} />
                <CompactLogStat label="출력" value={`${log.output_bytes.toLocaleString("ko-KR")}B`} />
                <CompactLogStat label="소요" value={formatDuration(log.duration_ms)} />
              </dl>
              {log.error_message && (
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-red-600">{log.error_message}</p>
              )}
            </button>
          ))
        )}
      </div>

      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-3 py-2 font-medium">시각</th>
              <th className="px-3 py-2 font-medium">사용자</th>
              <th className="px-3 py-2 font-medium">모드</th>
              <th className="px-3 py-2 font-medium">결과</th>
              <th className="px-3 py-2 font-medium">입력</th>
              <th className="px-3 py-2 font-medium">출력</th>
              <th className="px-3 py-2 font-medium">소요시간</th>
              <th className="px-3 py-2 font-medium">상세</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  조건에 맞는 AI 로그가 없습니다.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50/80"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-3 py-3 text-slate-700">{formatCompactDate(log.requested_at)}</td>
                  <td className="px-3 py-3 text-slate-700">{log.user_email}</td>
                  <td className="px-3 py-3">
                    <LogModeBadge mode={log.mode} />
                  </td>
                  <td className="px-3 py-3">
                    <LogStatusBadge success={log.success} errorCode={log.error_code} />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{log.input_chars.toLocaleString("ko-KR")}자</td>
                  <td className="px-3 py-3 text-slate-700">{log.output_bytes.toLocaleString("ko-KR")}B</td>
                  <td className="px-3 py-3 text-slate-700">{formatDuration(log.duration_ms)}</td>
                  <td className="px-3 py-3 text-xs leading-5 text-slate-500">
                    <div>{log.message_count}개 메시지 · {log.model}</div>
                    {log.error_message && <div className="mt-1 text-red-600">{log.error_message}</div>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <AiWriteLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </AdminSurface>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function CompactLogStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-center">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xs font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function LogModeBadge({ mode }: { mode: AiWriteLogsData["logs"][number]["mode"] }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      {mode === "generate" ? "초안 생성" : "대화"}
    </span>
  );
}

function LogStatusBadge({
  success,
  errorCode,
}: {
  success: boolean;
  errorCode: string | null;
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {success ? "성공" : errorCode ?? "실패"}
    </span>
  );
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function AiWriteLogDetailModal({
  log,
  onClose,
}: {
  log: AiWriteLogsData["logs"][number];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[min(720px,calc(100dvh-1rem))] sm:max-h-[min(720px,calc(100dvh-2rem))]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h4 className="text-base font-semibold text-slate-900">AI 로그 상세</h4>
            <p className="mt-1 text-sm text-slate-500">{formatFullDate(log.requested_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
        </div>

        <div className="grid max-h-[calc(100dvh-11rem)] gap-4 overflow-y-auto px-5 py-5 md:grid-cols-2">
          <DetailItem label="사용자" value={log.user_email} />
          <DetailItem label="모드" value={log.mode === "generate" ? "초안 생성" : "대화"} />
          <DetailItem label="결과" value={log.success ? "성공" : log.error_code ?? "실패"} />
          <DetailItem label="모델" value={log.model} />
          <DetailItem label="메시지 수" value={`${log.message_count}개`} />
          <DetailItem label="입력 길이" value={`${log.input_chars.toLocaleString("ko-KR")}자`} />
          <DetailItem label="출력 크기" value={`${log.output_bytes.toLocaleString("ko-KR")}B`} />
          <DetailItem label="소요시간" value={formatDuration(log.duration_ms)} />
          <DetailItem label="완료 시각" value={log.completed_at ? formatFullDate(log.completed_at) : "—"} />
        </div>

        <div className="border-t border-slate-200 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">에러 메시지</p>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {log.error_message ?? "에러 없음"}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900 break-all">{value}</div>
    </div>
  );
}

function formatFullDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}
