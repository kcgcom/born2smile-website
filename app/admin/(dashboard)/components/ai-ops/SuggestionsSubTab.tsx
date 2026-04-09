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
  AiOpsSuggestionJobEvent,
  AiOpsSuggestionListItem,
  AiOpsTargetOption,
} from "@/lib/admin-ai-ops-types";
import { useAiSuggestionJob } from "./useAiSuggestionJob";
import { PriorityScoreBadge } from "./PriorityScoreBadge";

const JOB_STAGE_SEQUENCE: AiOpsSuggestionJob["stage"][] = ["queued", "context", "generation", "persisting", "completed"];
type WorkflowMode = "recommended" | "manual";

interface RecommendedExecutionItem {
  id: string;
  title: string;
  description: string;
  targetType: "post" | "page";
  targetId: string;
  playbookId?: string | null;
  priorityScore: number;
  source: "today" | "candidate";
}

export function SuggestionsSubTab() {
  const { data: playbooks, loading: playbooksLoading, error: playbooksError, refetch: refetchPlaybooks } = useAdminApi<AiOpsPlaybook[]>("/api/admin/ai-ops/playbooks");
  const { data: targets, loading: targetsLoading, error: targetsError, refetch: refetchTargets } = useAdminApi<AiOpsTargetOption[]>("/api/admin/ai-ops/targets");
  const { data: briefing, loading: briefingLoading, error: briefingError, refetch: refetchBriefing } = useAdminApi<AiOpsBriefing>("/api/admin/ai-ops/briefing?period=30d");
  const { data: recentSuggestions, loading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=4");
  const { mutate, loading: creating, error: createError, clearError } = useAdminMutation<AiOpsSuggestionJob>();
  const { job, events, loading: jobLoading, error: jobError, bindJob } = useAiSuggestionJob();

  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("recommended");
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

  const handleSelectRecommendedItem = (item: RecommendedExecutionItem) => {
    setWorkflowMode("recommended");
    setTargetType(item.targetType);
    setSelectedTargetIds((prev) => {
      if (item.targetType !== targetType) {
        return [item.targetId];
      }
      if (prev.includes(item.targetId)) {
        const next = prev.filter((id) => id !== item.targetId);
        return next;
      }
      return [...prev, item.targetId].slice(0, 3);
    });
    if (item.playbookId) {
      setPlaybookId(item.playbookId);
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

  const handleRemoveSelectedTarget = (targetId: string) => {
    setSelectedTargetIds((prev) => prev.filter((id) => id !== targetId));
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

  const recommendedItems = useMemo(() => {
    const readyTasks = briefing?.todayTasks ?? [];
    const merged = new Map<string, RecommendedExecutionItem>();

    for (const task of readyTasks) {
      if (task.targetType === "site") continue;
      const key = `${task.targetType}:${task.targetId}`;
      merged.set(key, {
        id: task.id,
        title: task.title,
        description: task.description,
        targetType: task.targetType,
        targetId: task.targetId,
        playbookId: task.playbookId ?? null,
        priorityScore: task.priorityScore,
        source: "today",
      });
    }

    for (const candidate of briefing?.topCandidates ?? []) {
      if (candidate.targetType === "site") continue;
      const key = `${candidate.targetType}:${candidate.targetId}`;
      if (merged.has(key)) continue;
      merged.set(key, {
        id: candidate.id,
        title: candidate.title,
        description: candidate.evidence.summary,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        playbookId: candidate.playbookIds[0] ?? null,
        priorityScore: candidate.priorityScore,
        source: "candidate",
      });
    }

    return [...merged.values()].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6);
  }, [briefing?.topCandidates, briefing?.todayTasks]);
  const selectionSummary = selectedTargetIdsSafe[0]
    ? (() => {
        const target = targetOptions.find((item) => item.id === selectedTargetIdsSafe[0]);
        if (!target || !target.recommendedPlaybooks[0]) return null;
        return `추천 사유: ${target.note} → 추천 플레이북: ${getPlaybookLabel(target.recommendedPlaybooks[0])} → 추천 작업 유형: ${getSuggestedActionLabel(target.recommendedPlaybooks[0])}`;
      })()
    : null;
  const selectedTargets = selectedTargetIdsSafe
    .map((id) => targetOptions.find((target) => target.id === id))
    .filter((item): item is AiOpsTargetOption => Boolean(item));
  const progressSteps = useMemo(() => buildJobProgressSteps(job, events), [events, job]);
  const completedSteps = progressSteps.filter((step) => step.state === "done").length;
  const activeStep = progressSteps.find((step) => step.state === "current") ?? null;
  const recentEvents = events.slice(-5).reverse();
  const latestEvent = recentEvents[0] ?? null;

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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[var(--color-primary)]" />
                  <h3 className="text-lg font-bold text-slate-900">실행 방식</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  추천된 작업을 바로 실행하거나, 필요할 때만 직접 대상을 골라 생성합니다.
                </p>
              </div>
              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setWorkflowMode("recommended")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    workflowMode === "recommended" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  추천 실행
                </button>
                <button
                  type="button"
                  onClick={() => setWorkflowMode("manual")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    workflowMode === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  직접 생성
                </button>
              </div>
            </div>
          </AdminSurface>

          {workflowMode === "recommended" ? (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[var(--color-primary)]" />
                    <h3 className="text-lg font-bold text-slate-900">추천 후보</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    브리핑과 추가 후보를 한 목록으로 합쳤습니다. 클릭해서 바로 실행 대상으로 담을 수 있습니다.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                  <div className="text-xs font-medium text-slate-500">선택</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{selectedTargetIdsSafe.length}/3</div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {briefingLoading ? (
                  <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                ) : recommendedItems.length === 0 ? (
                  <EmptyState text="지금 바로 실행할 추천 후보가 없습니다." />
                ) : (
                  recommendedItems.map((item) => {
                    const selected = targetType === item.targetType && selectedTargetIdsSafe.includes(item.targetId);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectRecommendedItem(item)}
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          selected
                            ? "border-[var(--color-primary)] bg-blue-50"
                            : "border-slate-200 bg-slate-50 hover:border-[var(--color-primary)] hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                item.source === "today" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                              }`}>
                                {item.source === "today" ? "오늘 우선" : "추가 후보"}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
                          </div>
                          <PriorityScoreBadge score={item.priorityScore} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <AdminPill tone="white">{targetTypeLabel(item.targetType)}</AdminPill>
                          {item.playbookId ? <AdminPill tone="white">{getPlaybookLabel(item.playbookId)}</AdminPill> : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </AdminSurface>
          ) : (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-lg font-bold text-slate-900">직접 생성 안내</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                우측 상단의 실행 설정에서 원하는 대상을 직접 고를 수 있습니다. 추천 목록은 숨기고 실행에 집중한 상태입니다.
              </p>
            </AdminSurface>
          )}

          {createError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{createError}</div>}
          {createdMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{createdMessage}</div>}
        </div>

        <div className="space-y-6">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-lg font-bold text-slate-900">실행 설정</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {workflowMode === "recommended"
                ? "선택된 후보를 확인하고 바로 초안을 생성합니다."
                : "추천과 별개로 원하는 대상을 직접 골라 초안을 생성합니다."}
            </p>

            <div className="mt-5 space-y-4">
              {workflowMode === "recommended" ? (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-700">선택된 대상</label>
                    <button
                      type="button"
                      onClick={() => setWorkflowMode("manual")}
                      className="text-xs font-medium text-[var(--color-primary)]"
                    >
                      직접 선택으로 전환
                    </button>
                  </div>
                  {selectedTargets.length === 0 ? (
                    <EmptyState text="좌측 추천 후보에서 대상을 선택해 주세요." />
                  ) : (
                    <div className="space-y-2">
                      {selectedTargets.map((target) => (
                        <div key={target.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{target.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{target.note}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedTarget(target.id)}
                            className="text-xs font-medium text-slate-500"
                          >
                            제거
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
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
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-slate-700">대상 선택 (최대 3개)</label>
                      <span className="text-xs font-medium text-slate-500">
                        선택 {selectedTargetIdsSafe.length}/3
                      </span>
                    </div>
                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
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
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

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
                {selectionSummary && workflowMode === "recommended" && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-slate-700">
                    {selectionSummary}
                  </div>
                )}
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
          </AdminSurface>

          {(job || jobLoading || jobError) && (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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
                </div>
                {job && (
                  <div className="min-w-[140px] rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <div className="text-xs font-medium text-slate-500">현재 단계</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{stageLabel(job.stage)}</div>
                  </div>
                )}
              </div>

              {job && (
                <>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500">작업 대상</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {targetTypeLabel(job.targetType)} · {job.targetId}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-500">단계 진행</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {job.status === "completed" ? JOB_STAGE_SEQUENCE.length : completedSteps}/{JOB_STAGE_SEQUENCE.length}
                        </div>
                      </div>
                    </div>
                    {activeStep && job.status === "running" && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                        진행 중: {activeStep.label}
                      </div>
                    )}
                    {latestEvent && (
                      <div className="mt-3 text-xs text-slate-500">
                        최근 업데이트: {latestEvent.message}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="-mx-1 overflow-x-auto pb-1">
                      <div className="flex min-w-max items-center px-1">
                        {progressSteps.map((step, index) => (
                          <div key={step.stage} className="flex items-center">
                            {index > 0 && (
                              <div
                                aria-hidden="true"
                                className={`mx-2 h-px w-8 shrink-0 sm:w-10 ${stepConnectorTone(progressSteps[index - 1]?.state ?? "pending")}`}
                              />
                            )}
                            <div className="flex min-w-[72px] flex-col items-center gap-1 text-center">
                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${stepTone(step.state)}`}>
                                {step.state === "current" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="text-[11px] font-semibold leading-tight text-slate-900">
                                {step.label}
                              </div>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stepBadgeTone(step.state)}`}>
                                {stepStateLabel(step.state)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[11px] font-medium text-slate-500">현재 단계 안내</div>
                      <div className="mt-1 text-sm text-slate-700">
                        {(activeStep?.message ?? latestEvent?.message ?? (job ? defaultStageMessage(job.stage) : "")) || "진행 상태를 확인하고 있습니다."}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {job?.lastError && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {job.lastError}
                </div>
              )}
            </AdminSurface>
          )}

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

function stageLabel(stage: AiOpsSuggestionJob["stage"]) {
  switch (stage) {
    case "queued":
      return "대기";
    case "context":
      return "문맥 수집";
    case "generation":
      return "초안 생성";
    case "persisting":
      return "저장";
    case "completed":
      return "완료";
    default:
      return stage;
  }
}

function defaultStageMessage(stage: AiOpsSuggestionJob["stage"]) {
  switch (stage) {
    case "queued":
      return "작업 큐에 등록되어 실행을 기다립니다.";
    case "context":
      return "대상 정보와 추천 기준을 수집하고 있습니다.";
    case "generation":
      return "AI가 초안 내용을 만들고 있습니다.";
    case "persisting":
      return "생성된 초안을 저장하고 후속 검토를 준비합니다.";
    case "completed":
      return "초안 생성이 끝났습니다.";
    default:
      return "";
  }
}

function stepStateLabel(state: "done" | "current" | "pending" | "failed") {
  switch (state) {
    case "done":
      return "완료";
    case "current":
      return "진행 중";
    case "failed":
      return "실패";
    default:
      return "대기";
  }
}

function stepTone(state: "done" | "current" | "pending" | "failed") {
  switch (state) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "current":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-400";
  }
}

function stepBadgeTone(state: "done" | "current" | "pending" | "failed") {
  switch (state) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "current":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function stepConnectorTone(state: "done" | "current" | "pending" | "failed") {
  switch (state) {
    case "done":
      return "bg-emerald-300";
    case "current":
      return "bg-blue-300";
    case "failed":
      return "bg-red-300";
    default:
      return "bg-slate-200";
  }
}

function buildJobProgressSteps(job: AiOpsSuggestionJob | null, events: AiOpsSuggestionJobEvent[]) {
  const latestEventByStage = new Map<AiOpsSuggestionJob["stage"], AiOpsSuggestionJobEvent>();
  for (const event of events) {
    latestEventByStage.set(event.stage, event);
  }

  const currentIndex = job ? JOB_STAGE_SEQUENCE.indexOf(job.stage) : -1;
  return JOB_STAGE_SEQUENCE.map((stage, index) => {
    const latestEvent = latestEventByStage.get(stage);
    let state: "done" | "current" | "pending" | "failed" = "pending";

    if (job?.status === "failed" && stage === job.stage) {
      state = "failed";
    } else if (job?.status === "completed" || (currentIndex > index && currentIndex >= 0)) {
      state = "done";
    } else if (job && stage === job.stage) {
      state = "current";
    }

    return {
      stage,
      label: stageLabel(stage),
      state,
      message: latestEvent?.message ?? (job?.stage === stage ? job.message : undefined),
    };
  });
}
