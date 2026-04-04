"use client";

import { Clock3 } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi } from "../useAdminApi";
import type { AiOpsActivityItem } from "@/lib/admin-ai-ops-types";

export function ActivitySubTab() {
  const { data, loading, error, refetch } = useAdminApi<AiOpsActivityItem[]>("/api/admin/ai-ops/activity?limit=30");

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">활동 로그</h3>
          <p className="mt-1 text-sm text-slate-600">누가 어떤 제안을 승인·반려·반영했는지 추적합니다.</p>
        </div>
        <AdminPill tone="white">{data?.length ?? 0}건</AdminPill>
      </div>

      <div className="mt-4 space-y-3">
        {(data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            아직 기록된 활동이 없습니다.
          </div>
        ) : (
          (data ?? []).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.suggestionTitle}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.targetLabel} · {actionLabel(item.action)}</div>
                  {item.note && <div className="mt-2 text-sm text-slate-600">{item.note}</div>}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDateTime(item.createdAt)}
                  </div>
                  <div className="mt-1">{item.actorEmail}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminSurface>
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
    case "rollback":
      return "롤백";
    default:
      return action;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
