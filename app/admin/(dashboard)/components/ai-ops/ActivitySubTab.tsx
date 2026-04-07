"use client";

import { Clock3, History, LineChart } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi } from "../useAdminApi";
import type { AiOpsActivityItem, AiOpsOutcomesResponse } from "@/lib/admin-ai-ops-types";
import { SignalVerdictBadge } from "./SignalVerdictBadge";

export function ActivitySubTab() {
  const { data: activity, loading: activityLoading, error: activityError, refetch: refetchActivity } = useAdminApi<AiOpsActivityItem[]>("/api/admin/ai-ops/activity?limit=20");
  const { data: outcomes, loading: outcomesLoading, error: outcomesError, refetch: refetchOutcomes } = useAdminApi<AiOpsOutcomesResponse>("/api/admin/ai-ops/outcomes?limit=10");

  if (activityError) return <AdminErrorState message={activityError} onRetry={refetchActivity} />;
  if (outcomesError) return <AdminErrorState message={outcomesError} onRetry={refetchOutcomes} />;

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-slate-900">활동·관측</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">반영 이력과 관측 결과를 한 화면에서 확인합니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryChip label="최근 관측" value={`${outcomes?.items.length ?? 0}건`} />
            <SummaryChip label="관측 대기" value={`${outcomes?.pending.length ?? 0}건`} />
            <SummaryChip label="활동 로그" value={`${activity?.length ?? 0}건`} />
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <LineChart className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-lg font-bold text-slate-900">최근 관측 신호</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">표본이 적으면 유보도 정상입니다.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {outcomesLoading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ) : outcomes?.items.length ? (
              outcomes.items.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.windowDays}일 관측 · {item.targetLabel}</div>
                    </div>
                    <SignalVerdictBadge verdict={item.verdict} />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{item.summary}</div>
                </div>
              ))
            ) : (
              <EmptyCopy text="아직 집계된 관측 신호가 없습니다." />
            )}
          </div>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-lg font-bold text-slate-900">관측 대기 목록</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">체크포인트가 되면 다시 확인합니다.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {outcomesLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ) : outcomes?.pending.length ? (
              outcomes.pending.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{item.summary}</div>
                  <div className="mt-2 text-xs text-slate-500">{item.nextCheckpoint.label}까지 {item.daysRemaining}일 남음</div>
                </div>
              ))
            ) : (
              <EmptyCopy text="관측 대기 중인 작업이 없습니다." />
            )}
          </div>
        </AdminSurface>
      </div>

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-slate-900">활동 로그</h3>
            </div>
            <p className="mt-1 text-sm text-slate-600">승인·반려·반영·관측 이력을 확인합니다.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {activityLoading ? (
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ) : activity?.length ? (
            activity.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.suggestionTitle}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.targetLabel} · {actionLabel(item.action)}</div>
                    {item.note && <div className="mt-2 text-sm text-slate-600">{item.note}</div>}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{new Date(item.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="mt-1">{item.actorEmail}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyCopy text="아직 기록된 활동이 없습니다." />
          )}
        </div>
      </AdminSurface>
    </div>
  );
}

function actionLabel(action: AiOpsActivityItem["action"]) {
  switch (action) {
    case "approve":
      return "승인";
    case "reject":
      return "반려";
    case "apply":
      return "반영";
    case "measure":
      return "관측 기록";
    default:
      return "기록";
  }
}

function EmptyCopy({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
