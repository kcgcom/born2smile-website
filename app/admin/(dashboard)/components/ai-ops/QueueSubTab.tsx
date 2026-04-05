"use client";

import { Loader2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import type { AiOpsSuggestionListItem } from "@/lib/admin-ai-ops-types";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { SuggestionDiffCard } from "./SuggestionDiffCard";

export function QueueSubTab() {
  const { data, loading, error, refetch } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=50");
  const { mutate, loading: actionLoading, error: actionError, clearError } = useAdminMutation<AiOpsSuggestionListItem>();

  const queueItems = (data ?? []).filter((item) => item.status === "draft" || item.status === "approved");

  const runAction = async (id: number, action: "approve" | "reject" | "apply") => {
    clearError();
    const result = await mutate(`/api/admin/ai-ops/suggestions/${id}/${action}`, "POST", {});
    if (!result.error) {
      refetch();
    }
  };

  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">승인 대기함</h3>
            <p className="mt-1 text-sm text-slate-600">초안은 승인 후, 블로그 제목·요약문·FAQ·내부링크 제안은 승인 뒤 즉시 반영까지 이어갈 수 있습니다.</p>
          </div>
          <AdminPill tone="white">{queueItems.length}건</AdminPill>
        </div>
      </AdminSurface>

      <div className="space-y-4">
        {queueItems.length === 0 ? (
          <AdminSurface tone="white" className="rounded-3xl p-8 text-center text-sm text-slate-500">
            현재 검토할 운영 제안이 없습니다.
          </AdminSurface>
        ) : (
          queueItems.map((item) => (
            <AdminSurface key={item.id} tone="white" className="rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <PriorityScoreBadge score={item.priorityScore} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{statusLabel(item.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.targetLabel} · {labelForSuggestionType(item.suggestionType)}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.status === "draft" && (
                    <>
                      <AdminActionButton tone="dark" onClick={() => runAction(item.id, "approve")} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        승인
                      </AdminActionButton>
                      <AdminActionButton tone="dark" onClick={() => runAction(item.id, "reject")} disabled={actionLoading}>
                        <XCircle className="h-4 w-4" />
                        반려
                      </AdminActionButton>
                    </>
                  )}
                  {item.status === "approved" && (
                    <AdminActionButton tone="primary" onClick={() => runAction(item.id, "apply")} disabled={actionLoading || !item.canApply}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {item.canApply ? "반영" : "페이지 제안은 수동 반영"}
                    </AdminActionButton>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <SuggestionDiffCard before={item.beforeJson} after={item.afterJson} />
              </div>
            </AdminSurface>
          ))
        )}
      </div>
    </div>
  );
}

function labelForSuggestionType(type: AiOpsSuggestionListItem["suggestionType"]) {
  switch (type) {
    case "title":
      return "제목";
    case "meta_description":
      return "요약문";
    case "faq":
      return "FAQ";
    case "body_revision":
      return "본문";
    case "internal_links":
      return "링크";
    default:
      return type;
  }
}

function statusLabel(status: AiOpsSuggestionListItem["status"]) {
  switch (status) {
    case "draft":
      return "검토 전";
    case "approved":
      return "승인됨";
    case "rejected":
      return "반려됨";
    case "applied":
      return "반영됨";
    default:
      return status;
  }
}
