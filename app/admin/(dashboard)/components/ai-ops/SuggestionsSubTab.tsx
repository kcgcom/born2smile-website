"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Waves, XCircle } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import type {
  AiOpsBriefing,
  AiOpsSuggestionJob,
  AiOpsSuggestionJobEvent,
  AiOpsSuggestionListItem,
  AiOpsSuggestionType,
  AiOpsTargetOption,
  AiOpsTargetType,
} from "@/lib/admin-ai-ops-types";
import { PriorityScoreBadge } from "./PriorityScoreBadge";
import { useAiSuggestionJob } from "./useAiSuggestionJob";

const POST_SUGGESTION_TYPES: Array<{ value: AiOpsSuggestionType; label: string }> = [
  { value: "title", label: "제목 개선" },
  { value: "meta_description", label: "요약문 개선" },
  { value: "internal_links", label: "내부 링크" },
  { value: "faq", label: "FAQ 추가" },
  { value: "body_revision", label: "도입부 보강" },
];

const PAGE_SUGGESTION_TYPES: Array<{ value: AiOpsSuggestionType; label: string }> = [
  { value: "title", label: "메타 타이틀" },
  { value: "meta_description", label: "메타 설명" },
  { value: "internal_links", label: "내부 링크" },
  { value: "faq", label: "FAQ 제안" },
  { value: "body_revision", label: "본문 보강" },
];

export function SuggestionsSubTab() {
  const { data: briefing, loading: briefingLoading, error: briefingError, refetch: refetchBriefing } = useAdminApi<AiOpsBriefing>("/api/admin/ai-ops/briefing?period=28d");
  const { data: targets, loading: targetsLoading, error: targetsError, refetch: refetchTargets } = useAdminApi<AiOpsTargetOption[]>("/api/admin/ai-ops/targets");
  const { data: recentSuggestions, loading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=8");
  const { mutate, loading: creating, error: createError, clearError } = useAdminMutation<AiOpsSuggestionJob>();
  const { job, events, loading: jobLoading, error: jobError, bindJob, clearCurrentJob } = useAiSuggestionJob();

  const [targetType, setTargetType] = useState<AiOpsTargetType>("post");
  const [targetId, setTargetId] = useState("");
  const [suggestionType, setSuggestionType] = useState<AiOpsSuggestionType>("title");
  const [operatorContext, setOperatorContext] = useState("");
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const previousJobStatusRef = useRef<AiOpsSuggestionJob["status"] | null>(null);
  const visibleCreatedMessage = job?.status === "completed" ? "운영 제안을 생성했습니다." : createdMessage;

  const targetOptions = useMemo(() => {
    return (targets ?? [])
      .filter((target) => target.targetType === targetType)
      .map((target) => ({
        value: target.id,
        label: target.note ? `${target.label} · ${target.note}` : target.label,
      }));
  }, [targets, targetType]);

  const suggestionTypeOptions = targetType === "post" ? POST_SUGGESTION_TYPES : PAGE_SUGGESTION_TYPES;

  const resolvedTargetId = targetOptions.some((option) => option.value === targetId)
    ? targetId
    : (targetOptions[0]?.value ?? "");
  const resolvedSuggestionType = suggestionTypeOptions.some((option) => option.value === suggestionType)
    ? suggestionType
    : (suggestionTypeOptions[0]?.value ?? "title");

  const handleCreate = async () => {
    if (!resolvedTargetId) return;
    clearError();
    setCreatedMessage(null);
    const result = await mutate("/api/admin/ai-ops/suggestion-jobs", "POST", {
      targetType,
      targetId: resolvedTargetId,
      suggestionType: resolvedSuggestionType,
      ...(operatorContext.trim() ? { context: operatorContext.trim() } : {}),
    });
    if (!result.error && result.data) {
      bindJob(result.data.id);
      setCreatedMessage("운영 제안 생성을 시작했습니다.");
    }
  };

  useEffect(() => {
    const previousStatus = previousJobStatusRef.current;
    if (!job) {
      previousJobStatusRef.current = null;
      return;
    }

    if (job.status === "completed" && previousStatus !== "completed") {
      refetchSuggestions();
      refetchBriefing();
    }

    if (job.status === "failed" && previousStatus !== "failed") {
      refetchBriefing();
    }

    previousJobStatusRef.current = job.status;
  }, [job, refetchBriefing, refetchSuggestions]);

  if (briefingError) {
    return <AdminErrorState message={briefingError} onRetry={refetchBriefing} />;
  }

  if (targetsError) {
    return <AdminErrorState message={targetsError} onRetry={refetchTargets} />;
  }

  if (suggestionsError) {
    return <AdminErrorState message={suggestionsError} onRetry={refetchSuggestions} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-slate-900">새 제안 생성</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            블로그 또는 핵심 페이지를 선택해 운영 제안을 생성합니다.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 유형</label>
              <select
                value={targetType}
                onChange={(event) => {
                  setTargetType(event.target.value as AiOpsTargetType);
                  setTargetId("");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="post">블로그 포스트</option>
                <option value="page">핵심 페이지</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 선택</label>
              <select
                value={resolvedTargetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                disabled={targetsLoading}
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">제안 유형</label>
              <select
                value={resolvedSuggestionType}
                onChange={(event) => setSuggestionType(event.target.value as AiOpsSuggestionType)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
              >
                {suggestionTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">운영자 추가 지시</label>
              <textarea
                value={operatorContext}
                onChange={(event) => setOperatorContext(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="예: 김포/장기동 검색 의도를 더 반영하고, 예약 전환 문구는 부드럽게 유지"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                검색 의도, 톤, 강조할 치료 키워드처럼 이번 제안에만 반영할 힌트를 남길 수 있습니다.
              </p>
            </div>

            <AdminActionButton tone="primary" onClick={handleCreate} disabled={creating || !resolvedTargetId} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              제안 생성
            </AdminActionButton>
          </div>

          {createError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {createError}
            </div>
          )}
          {visibleCreatedMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {visibleCreatedMessage}
            </div>
          )}
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">브리핑 추천 후보</h3>
              <p className="mt-1 text-sm text-slate-600">우선순위가 높은 대상부터 빠르게 제안을 생성하세요.</p>
            </div>
            {briefing && <AdminPill tone="white">{briefing.topCandidates.length}건</AdminPill>}
          </div>

          <div className="mt-4 space-y-3">
            {briefingLoading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ) : (
              briefing?.topCandidates.map((candidate) => (
                <div key={candidate.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{candidate.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{candidate.primaryIssue}</div>
                    </div>
                    <PriorityScoreBadge score={candidate.priorityScore} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {candidate.suggestionTypes.slice(0, 3).map((type) => (
                      <button
                        key={`${candidate.id}-${type}`}
                        type="button"
                        onClick={() => {
                          setTargetType(candidate.targetType);
                          setTargetId(candidate.targetId);
                          setSuggestionType(type);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {labelForSuggestionType(type)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSurface>
      </div>

      {(job || jobLoading || jobError) && (
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-lg font-bold text-slate-900">실시간 생성 상태</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">Supabase Realtime으로 현재 제안 생성 단계를 반영합니다.</p>
            </div>
            {job && (
              <div className="flex items-center gap-2">
                <AdminPill tone="white">{jobLabel(job)}</AdminPill>
                <button
                  type="button"
                  onClick={clearCurrentJob}
                  className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                >
                  패널 닫기
                </button>
              </div>
            )}
          </div>

          {jobLoading && !job ? (
            <div className="mt-4 h-28 animate-pulse rounded-2xl bg-slate-100" />
          ) : jobError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {jobError}
            </div>
          ) : job ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{labelForSuggestionType(job.suggestionType)} · {job.targetId}</div>
                    <div className="mt-1 text-xs text-slate-500">{stageLabel(job.stage)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {job.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : job.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
                    )}
                    <span className="font-medium text-slate-700">{job.message}</span>
                  </div>
                </div>
                {job.lastError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-600">
                    {job.lastError}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                    아직 수신된 진행 이벤트가 없습니다.
                  </div>
                ) : (
                  events.map((event) => (
                    <JobEventRow key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
          ) : null}
        </AdminSurface>
      )}

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">최근 생성된 제안</h3>
            <p className="mt-1 text-sm text-slate-600">바로 승인 대기함에서 검토할 수 있습니다.</p>
          </div>
          <AdminPill tone="white">{recentSuggestions?.length ?? 0}건</AdminPill>
        </div>
        <div className="mt-4 space-y-3">
          {suggestionsLoading ? (
            <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            (recentSuggestions ?? []).map((suggestion) => (
              <div key={suggestion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{suggestion.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{suggestion.targetLabel} · {labelForSuggestionType(suggestion.suggestionType)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityScoreBadge score={suggestion.priorityScore} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{statusLabel(suggestion.status)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminSurface>
    </div>
  );
}

function jobLabel(job: AiOpsSuggestionJob) {
  switch (job.status) {
    case "queued":
      return "대기 중";
    case "running":
      return "생성 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return job.status;
  }
}

function stageLabel(stage: AiOpsSuggestionJob["stage"]) {
  switch (stage) {
    case "queued":
      return "대기열 등록";
    case "context":
      return "문맥 수집";
    case "generation":
      return "AI 생성";
    case "persisting":
      return "저장";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return stage;
  }
}

function JobEventRow({ event }: { event: AiOpsSuggestionJobEvent }) {
  const tone = event.status === "failed"
    ? "border-red-200 bg-red-50 text-red-600"
    : event.status === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{event.message}</div>
        <div className="text-xs opacity-70">{stageLabel(event.stage)}</div>
      </div>
    </div>
  );
}

function labelForSuggestionType(type: AiOpsSuggestionType) {
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
