"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Target, Wand2 } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "../AdminErrorState";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import type {
  AiOpsBriefing,
  AiOpsPlaybook,
  AiOpsRecommendedAction,
  AiOpsSuggestionJob,
  AiOpsSuggestionListItem,
  AiOpsTargetOption,
} from "@/lib/admin-ai-ops-types";
import { useAiSuggestionJob } from "./useAiSuggestionJob";
import { PriorityScoreBadge } from "./PriorityScoreBadge";

export function SuggestionsSubTab() {
  const { data: playbooks, loading: playbooksLoading, error: playbooksError, refetch: refetchPlaybooks } = useAdminApi<AiOpsPlaybook[]>("/api/admin/ai-ops/playbooks");
  const { data: targets, loading: targetsLoading, error: targetsError, refetch: refetchTargets } = useAdminApi<AiOpsTargetOption[]>("/api/admin/ai-ops/targets");
  const { data: briefing, loading: briefingLoading, error: briefingError, refetch: refetchBriefing } = useAdminApi<AiOpsBriefing>("/api/admin/ai-ops/briefing?period=30d");
  const { data: recentSuggestions, loading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=4");
  const { mutate, loading: creating, error: createError, clearError } = useAdminMutation<AiOpsSuggestionJob>();
  const { job, events, loading: jobLoading, error: jobError, bindJob } = useAiSuggestionJob();

  const [targetType, setTargetType] = useState<"post" | "page">("post");
  const [playbookId, setPlaybookId] = useState<string>("");
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [operatorContext, setOperatorContext] = useState("");
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);

  const targetOptions = useMemo(() => {
    const raw = targets ?? [];
    return raw.filter((target) => target.targetType === targetType);
  }, [targetType, targets]);

  const filteredPlaybooks = useMemo(
    () => (playbooks ?? []).filter((item) => item.targetTypes.includes(targetType)),
    [playbooks, targetType],
  );
  const resolvedPlaybookId = playbookId || filteredPlaybooks[0]?.id || "";
  const selectedTargetIdsSafe = selectedTargetIds.filter((id) => targetOptions.some((target) => target.id === id));

  const activePlaybook = filteredPlaybooks.find((item) => item.id === resolvedPlaybookId) ?? null;

  const getRecommendedPlaybookId = (targetId: string) => {
    return targetOptions.find((target) => target.id === targetId)?.recommendedPlaybooks[0] ?? "";
  };

  const getPlaybookLabel = (nextPlaybookId: string) => {
    return playbooks?.find((item) => item.id === nextPlaybookId)?.label ?? nextPlaybookId;
  };

  const getSuggestedActionLabel = (nextPlaybookId: string) => {
    const playbook = playbooks?.find((item) => item.id === nextPlaybookId);
    if (!playbook) return "운영 작업";

    switch (playbook.defaultSuggestionType) {
      case "title":
        return "제목 개선";
      case "meta_description":
        return "요약문 개선";
      case "faq":
        return "FAQ 추가";
      case "internal_links":
        return "내부링크 보강";
      case "body_revision":
        return "본문 보강";
      default:
        return playbook.defaultSuggestionType;
    }
  };

  const prepareExecution = ({
    nextTargetType,
    nextTargetId,
    nextPlaybookId,
  }: {
    nextTargetType: "post" | "page";
    nextTargetId: string;
    nextPlaybookId?: string | null;
  }) => {
    setTargetType(nextTargetType);
    setSelectedTargetIds([nextTargetId]);
    if (nextPlaybookId) {
      setPlaybookId(nextPlaybookId);
    }
  };

  const handleToggleTarget = (targetId: string) => {
    const recommendedPlaybookId = getRecommendedPlaybookId(targetId);
    setSelectedTargetIds((prev) => {
      if (prev.includes(targetId)) {
        const next = prev.filter((item) => item !== targetId);
        if (next.length === 1) {
          const nextRecommended = getRecommendedPlaybookId(next[0]);
          if (nextRecommended) {
            setPlaybookId(nextRecommended);
          }
        }
        return next;
      }

      const next = [...prev.filter((id) => targetOptions.some((target) => target.id === id)), targetId].slice(0, 3);
      if (recommendedPlaybookId) {
        setPlaybookId(recommendedPlaybookId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!activePlaybook || selectedTargetIdsSafe.length === 0) return;
    clearError();
    setCreatedMessage(null);

    let lastJob: AiOpsSuggestionJob | null = null;
    for (const targetId of selectedTargetIdsSafe) {
      const result = await mutate("/api/admin/ai-ops/suggestion-jobs", "POST", {
        targetType,
        targetId,
        suggestionType: activePlaybook.defaultSuggestionType,
        playbookId: activePlaybook.id,
        context: operatorContext.trim() || undefined,
      });
      if (result.data) {
        lastJob = result.data;
      }
      if (result.error) {
        break;
      }
    }

    if (lastJob) {
      bindJob(lastJob.id);
      setCreatedMessage(`${selectedTargetIdsSafe.length}건의 실행 작업 생성을 시작했습니다.`);
      refetchSuggestions();
    }
  };

  const readyTasks = briefing?.todayTasks ?? [];
  const readyCandidateIds = new Set(readyTasks.map((task) => `${task.targetType}:${task.targetId}`));
  const topCandidates = (briefing?.topCandidates ?? [])
    .filter((item) => item.targetType === targetType && !readyCandidateIds.has(item.id))
    .slice(0, 3);
  const selectionSummary = selectedTargetIdsSafe[0]
    ? (() => {
        const target = targetOptions.find((item) => item.id === selectedTargetIdsSafe[0]);
        if (!target || !target.recommendedPlaybooks[0]) return null;
        return `추천 사유: ${target.note} → 추천 플레이북: ${getPlaybookLabel(target.recommendedPlaybooks[0])} → 추천 작업 유형: ${getSuggestedActionLabel(target.recommendedPlaybooks[0])}`;
      })()
    : null;

  useEffect(() => {
    if (job?.status === "completed") {
      refetchSuggestions();
    }
  }, [job?.status, refetchSuggestions]);


  if (playbooksError) return <AdminErrorState message={playbooksError} onRetry={refetchPlaybooks} />;
  if (targetsError) return <AdminErrorState message={targetsError} onRetry={refetchTargets} />;
  if (briefingError) return <AdminErrorState message={briefingError} onRetry={refetchBriefing} />;
  if (suggestionsError) return <AdminErrorState message={suggestionsError} onRetry={refetchSuggestions} />;

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-slate-900">실행 센터</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              오늘 처리할 후보를 고르고 초안을 바로 생성합니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryChip label="오늘 처리" value={`${briefing?.metrics.tasksReadyToday ?? 0}건`} />
            <SummaryChip label="관측 대기" value={`${briefing?.metrics.signalsPendingReview ?? 0}건`} />
            <SummaryChip label="최근 생성" value={`${recentSuggestions?.length ?? 0}건`} />
          </div>
        </div>
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[var(--color-primary)]" />
                  <h3 className="text-lg font-bold text-slate-900">우선 작업</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">브리핑에서 추린 항목입니다. 클릭하면 바로 생성 대상으로 잡습니다.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {briefingLoading ? (
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              ) : readyTasks.length === 0 ? (
                <EmptyState text="지금 잡을 우선 작업이 없습니다." />
              ) : (
                readyTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      if (task.targetType === "site") return;
                      prepareExecution({
                        nextTargetType: task.targetType,
                        nextTargetId: task.targetId,
                        nextPlaybookId: task.playbookId ?? null,
                      });
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-blue-50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{task.description}</div>
                      </div>
                      <PriorityScoreBadge score={task.priorityScore} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminPill tone="white">{targetTypeLabel(task.targetType)}</AdminPill>
                      {task.playbookId ? <AdminPill tone="white">{getPlaybookLabel(task.playbookId)}</AdminPill> : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </AdminSurface>

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-slate-900">초안 생성</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">최대 3개 대상까지 한 번에 생성할 수 있습니다.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 유형</label>
                <select
                  value={targetType}
                  onChange={(event) => {
                    setTargetType(event.target.value as "post" | "page");
                    setSelectedTargetIds([]);
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="post">블로그 포스트</option>
                  <option value="page">핵심 페이지</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">플레이북</label>
                <select
                  value={resolvedPlaybookId}
                  onChange={(event) => setPlaybookId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                  disabled={playbooksLoading}
                >
                  {(playbooks ?? []).filter((item) => item.targetTypes.includes(targetType)).map((playbook) => (
                    <option key={playbook.id} value={playbook.id}>{playbook.label}</option>
                  ))}
                </select>
                {activePlaybook && <p className="mt-2 text-xs text-slate-500">{activePlaybook.summary}</p>}
                {selectionSummary && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-slate-700">
                    {selectionSummary}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 선택 (최대 3개)</label>
                <div className="space-y-2">
                  {targetsLoading ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ) : (
                    targetOptions.map((target) => {
                      const checked = selectedTargetIdsSafe.includes(target.id);
                      return (
                        <label key={target.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${checked ? "border-[var(--color-primary)] bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                          <input type="checkbox" checked={checked} onChange={() => handleToggleTarget(target.id)} className="mt-1" />
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{target.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{target.note}</div>
                            {target.recommendedPlaybooks[0] && (
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[var(--color-primary)]">
                                  추천 플레이북: {getPlaybookLabel(target.recommendedPlaybooks[0])}
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">운영자 추가 지시</label>
                <textarea
                  value={operatorContext}
                  onChange={(event) => setOperatorContext(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={activePlaybook?.operatorPromptHint ?? "예: 김포/장기동 검색 의도를 더 반영하고 상담 문구는 부드럽게 유지"}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <AdminActionButton tone="primary" onClick={handleCreate} disabled={creating || !activePlaybook || selectedTargetIdsSafe.length === 0} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                초안 생성
              </AdminActionButton>
            </div>

            {createError && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{createError}</div>}
            {createdMessage && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{createdMessage}</div>}
          </AdminSurface>
        </div>

        <div className="space-y-6">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">추가 후보</h3>
                <p className="mt-1 text-sm text-slate-600">현재 필터에서 바로 이어서 볼 후보입니다.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {briefingLoading ? (
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              ) : topCandidates.length === 0 ? (
                <EmptyState text="지금 볼 추가 후보가 없습니다." />
              ) : topCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => {
                    if (candidate.targetType === "site") return;
                    prepareExecution({
                      nextTargetType: candidate.targetType,
                      nextTargetId: candidate.targetId,
                      nextPlaybookId: candidate.playbookIds[0] ?? null,
                    });
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-blue-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{candidate.title}</div>
                      <div className="mt-1 text-xs text-slate-500">추천 사유: {candidate.primaryIssue}</div>
                    </div>
                    <PriorityScoreBadge score={candidate.priorityScore} />
                  </div>
                  {candidate.playbookIds[0] && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[var(--color-primary)]">
                        추천 플레이북: {getPlaybookLabel(candidate.playbookIds[0])}
                      </span>
                    </div>
                  )}
                  <div className="mt-2 text-sm text-slate-600">{candidate.evidence.summary}</div>
                </button>
              ))}
            </div>
          </AdminSurface>

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">최근 생성 초안</h3>
                <p className="mt-1 text-sm text-slate-600">생성 후 검토·적용에서 마무리합니다.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {suggestionsLoading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ) : (
                (recentSuggestions ?? []).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{statusLabel(item.status)} · {item.targetLabel}</div>
                  </div>
                ))
              )}
            </div>
          </AdminSurface>

          {(job || jobLoading || jobError) && (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
                생성 진행 상태
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {jobError
                  ? `잡 상태 조회 오류: ${jobError}`
                  : jobLoading && !job
                    ? "잡 상태를 불러오고 있습니다."
                    : job?.message}
              </p>
              {job?.lastError && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {job.lastError}
                </div>
              )}
              {events.length > 0 && (
                <div className="mt-3 space-y-2 text-sm text-slate-500">
                  {events.slice(-4).map((event) => (
                    <div key={event.id}>{event.message}</div>
                  ))}
                </div>
              )}
            </AdminSurface>
          )}
        </div>
      </div>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function targetTypeLabel(value: AiOpsRecommendedAction["targetType"]) {
  switch (value) {
    case "post":
      return "블로그";
    case "page":
      return "페이지";
    default:
      return "사이트";
  }
}

function statusLabel(status: AiOpsSuggestionListItem["status"]) {
  switch (status) {
    case "draft":
      return "초안";
    case "approved":
      return "승인됨";
    case "applied":
      return "반영됨";
    default:
      return "반려됨";
  }
}
