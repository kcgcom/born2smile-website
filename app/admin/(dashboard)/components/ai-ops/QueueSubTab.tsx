"use client";

import { Loader2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import type { AiOpsPlaybook, AiOpsSuggestionListItem } from "@/lib/admin-ai-ops-types";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { SuggestionDiffCard } from "./SuggestionDiffCard";

export function QueueSubTab() {
  const { data, loading, error, refetch } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=50");
  const { data: playbooks } = useAdminApi<AiOpsPlaybook[]>("/api/admin/ai-ops/playbooks");
  const { mutate, loading: actionLoading, error: actionError, clearError } = useAdminMutation<AiOpsSuggestionListItem>();

  const queueItems = (data ?? []).filter((item) => item.status === "draft" || item.status === "approved");
  const draftCount = queueItems.filter((item) => item.status === "draft").length;
  const approvedCount = queueItems.filter((item) => item.status === "approved").length;
  const manualReviewCount = queueItems.filter((item) => item.applyMode === "manual").length;

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">검토·적용</h3>
            <p className="mt-1 text-sm text-slate-600">실행 센터에서 만든 초안을 여기서 검토하고 반영합니다.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryChip label="검토 전" value={`${draftCount}건`} />
            <SummaryChip label="반영 대기" value={`${approvedCount}건`} />
            <SummaryChip label="수동 검토" value={`${manualReviewCount}건`} />
          </div>
        </div>
      </AdminSurface>

      <div className="space-y-4">
        {queueItems.length === 0 ? (
          <AdminSurface tone="white" className="rounded-3xl p-8 text-center">
            <div className="text-sm text-slate-500">검토할 항목이 없습니다.</div>
            <AdminActionLink tone="dark" href="/admin/operations/ai-ops/suggestions" className="mt-4">
              실행 센터 열기
            </AdminActionLink>
          </AdminSurface>
        ) : (
          queueItems.map((item) => {
            const playbook = playbooks?.find((entry) => entry.id === item.playbookId);
            return (
              <AdminSurface key={item.id} tone="white" className="rounded-3xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                      <PriorityScoreBadge score={item.priorityScore} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{statusLabel(item.status)}</span>
                      <AdminPill tone="white">{item.applyMode === "auto" ? "자동 반영 가능" : "수동 검토 필요"}</AdminPill>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.targetLabel} · {playbook?.label ?? labelForSuggestionType(item.suggestionType)}</p>
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
                    {item.status === "approved" && item.applyMode === "auto" && (
                      <AdminActionButton tone="primary" onClick={() => runAction(item.id, "apply")} disabled={actionLoading || !item.canApply}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        반영
                      </AdminActionButton>
                    )}
                  </div>
                </div>

                {item.evidence && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">추천 근거</div>
                    <p className="mt-2 text-sm text-slate-600">{item.evidence.summary}</p>
                  </div>
                )}

                <div className="mt-5">
                  <SuggestionDiffCard before={item.beforeJson} after={item.afterJson} />
                </div>

                {item.applyMode === "manual" && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    자동 반영 없이 사람이 최종 확인 후 반영해야 합니다.
                  </div>
                )}
              </AdminSurface>
            );
          })
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
    default:
      return "반영됨";
  }
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
