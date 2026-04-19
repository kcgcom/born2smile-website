"use client";

import { useState } from "react";
import { Activity, AlertCircle, Clock3, Target } from "lucide-react";
import { AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi } from "../useAdminApi";
import type { AiOpsBriefing } from "@/lib/admin-ai-ops-types";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { SignalVerdictBadge } from "./SignalVerdictBadge";

export function BriefingSubTab() {
  const [period, setPeriod] = useState<"14d" | "30d" | "60d">("30d");
  const { data, loading, error, refetch } = useAdminApi<AiOpsBriefing>(`/api/admin/ai-ops/briefing?period=${period}`);

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <AdminSurface tone="success" className="rounded-3xl px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <AdminPill tone="sky">운영 브리핑</AdminPill>
            <h2 className="mt-3 text-2xl font-bold">{data.headline}</h2>
            <p className="mt-2 text-sm text-emerald-50/90">{data.summary}</p>
          </div>
          <div className="flex gap-2">
            {(["14d", "30d", "60d"] as const).map((value) => {
              const active = value === period;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-white text-emerald-800"
                      : "border border-white/20 bg-white/10 text-emerald-50"
                  }`}
                >
                  최근 {value.replace("d", "일")}
                </button>
              );
            })}
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="세션" value={formatMetric(data.metrics.sessions)} helper={formatChange(data.metrics.sessionsChange)} />
        <MetricCard label="검색 클릭" value={formatMetric(data.metrics.clicks)} helper={formatChange(data.metrics.clicksChange)} />
        <MetricCard label="검색 노출" value={formatMetric(data.metrics.impressions)} helper={formatChange(data.metrics.impressionsChange)} />
        <MetricCard label="오늘 작업" value={`${data.metrics.tasksReadyToday}건`} helper="즉시 실행 가능" />
        <MetricCard label="관측 대기" value={`${data.metrics.signalsPendingReview}건`} helper="다음 확인 예정" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">우선 작업</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            여기서는 우선순위만 보고, 실행은 실행 센터에서 이어갑니다.
          </p>
          <div className="mt-4 space-y-3">
            {data.todayTasks.length === 0 ? (
              <EmptyCopy text="지금 넘길 우선 작업이 없습니다." />
            ) : (
              data.todayTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{task.description}</div>
                    </div>
                    <PriorityScoreBadge score={task.priorityScore} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AdminPill tone="white">{task.targetType === "post" ? "블로그" : "페이지"}</AdminPill>
                  </div>
                </div>
              ))
            )}
          </div>
          <AdminActionLink tone="dark" href="/admin/operations/ai-ops/suggestions" className="mt-4 w-full">
            실행 센터 열기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">구조적 결함 큐</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.contentDebtQueue.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.primaryIssue}</div>
                  </div>
                  <PriorityScoreBadge score={item.priorityScore} />
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {item.issues.slice(0, 1).map((issue) => (
                    <li key={issue.code}>{issue.detail}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">관측 대기 작업</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.pendingObservation.length === 0 ? (
              <EmptyCopy text="관측 대기 작업이 없습니다." />
            ) : (
              data.pendingObservation.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{item.summary}</div>
                  <div className="mt-2 text-xs text-slate-500">다음 체크포인트: {item.nextCheckpoint.label} · {item.daysRemaining}일 남음</div>
                </div>
              ))
            )}
          </div>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">최근 관측 신호</h3>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentSignals.length === 0 ? (
              <EmptyCopy text="최근 관측 신호가 없습니다." />
            ) : (
              data.recentSignals.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.windowDays}일 관측 · {formatDate(item.measuredAt)}</div>
                    </div>
                    <SignalVerdictBadge verdict={item.verdict} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                </div>
              ))
            )}
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <AdminSurface tone="white" className="rounded-3xl p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{helper}</div>
    </AdminSurface>
  );
}

function EmptyCopy({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ko-KR");
}

function formatChange(value: number | null) {
  if (value === null) return "비교 데이터 부족";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}% vs 이전`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}
