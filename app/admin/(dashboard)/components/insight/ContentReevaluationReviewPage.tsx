"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { ConceptSupportLabel } from "@/lib/content-coverage/concept-review";
import type { ContentReevaluationState } from "@/lib/content-coverage/reevaluation-store";
import type { RetrievalReviewLabel } from "@/lib/content-coverage/retrieval-evaluation";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/content-coverage/reevaluation-review";
type TopicLabel = Exclude<RetrievalReviewLabel, null>;
type Draft = { topicReviewLabel: TopicLabel | null; conceptLabels: Record<string, ConceptSupportLabel | null>; notes: string };
type ResponseData = {
  states: ContentReevaluationState[];
  topics: Array<{ id: string; label: string; concepts: Array<{ id: string; label: string; description: string }> }>;
  stats: { total: number; pending: number; needsReview: number; completed: number; failed: number };
};

const TOPIC_LABELS: Array<{ value: TopicLabel; label: string }> = [
  { value: "relevant", label: "관련" },
  { value: "partial", label: "부분 관련" },
  { value: "irrelevant", label: "무관" },
];
const CONCEPT_LABELS: Array<{ value: ConceptSupportLabel; label: string }> = [
  { value: "supports", label: "충족" },
  { value: "partial", label: "부분 충족" },
  { value: "not-supported", label: "미충족" },
];

export function ContentReevaluationReviewPage() {
  const query = useAdminApi<ResponseData>(ENDPOINT);
  const mutation = useAdminMutation();
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [message, setMessage] = useState<string | null>(null);

  const reviewable = useMemo(() => query.data?.states.filter((state) => state.status === "needs-review" && state.candidateSet) ?? [], [query.data]);
  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="콘텐츠 재평가 데이터를 불러올 수 없습니다." />;

  const state = reviewable.find((candidate) => candidate.actionKey === selectedActionKey) ?? reviewable[0] ?? null;
  const incompleteItems = state?.candidateSet?.items.filter((item) => item.topicReviewLabel == null
    || item.conceptIds.some((conceptId) => item.conceptLabels[conceptId] == null)) ?? [];
  const item = incompleteItems.find((candidate) => candidate.id === selectedItemId) ?? incompleteItems[0] ?? null;
  const topic = query.data.topics.find((candidate) => candidate.id === state?.topicSpecId) ?? null;
  const draftKey = state && item ? `${state.actionKey}:${item.id}` : null;
  const draft = item && draftKey ? drafts[draftKey] ?? {
    topicReviewLabel: item.topicReviewLabel,
    conceptLabels: item.conceptLabels,
    notes: item.notes,
  } : null;
  const canSave = Boolean(draft?.topicReviewLabel && item?.conceptIds.every((conceptId) => draft.conceptLabels[conceptId] != null));

  const updateDraft = (updates: Partial<Draft>) => {
    if (!draftKey || !draft) return;
    setDrafts((current) => ({ ...current, [draftKey]: { ...draft, ...updates } }));
  };
  const save = async () => {
    if (!state || !item || !draftKey || !draft?.topicReviewLabel || !canSave) return;
    const conceptLabels = Object.fromEntries(item.conceptIds.map((conceptId) => [conceptId, draft.conceptLabels[conceptId]])) as Record<string, ConceptSupportLabel>;
    const result = await mutation.mutate(ENDPOINT, "PATCH", {
      actionKey: state.actionKey,
      id: item.id,
      topicReviewLabel: draft.topicReviewLabel,
      conceptLabels,
      notes: draft.notes.trim(),
    });
    if (!result.error) {
      setDrafts((current) => { const next = { ...current }; delete next[draftKey]; return next; });
      setSelectedItemId(null);
      setMessage(incompleteItems.length === 1 ? "재평가 검토를 완료해 최신 행동추천에 반영했습니다." : "후보 판정을 저장했습니다.");
      query.refetch();
    }
  };
  const retry = async (actionKey: string) => {
    const result = await mutation.mutate(ENDPOINT, "POST", { actionKey, action: "retry" });
    if (!result.error) { setMessage("재평가 요청을 다시 대기열에 넣었습니다."); query.refetch(); }
  };

  return <div className="space-y-6">
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><AdminPill tone="white">콘텐츠 재평가</AdminPill><h1 className="mt-3 text-xl font-bold">변경된 콘텐츠에서 다시 찾은 개념 근거를 검토합니다.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">임베딩 워커가 만든 후보를 사람 판정 없이 충족 근거로 승격하지 않습니다. 모든 후보의 주제 관련성과 개념 충족도를 확인하세요.</p><div className="mt-4 flex flex-wrap gap-2"><AdminActionLink tone="dark" href="/admin/content/strategy/actions"><ArrowLeft className="h-4 w-4" />행동추천으로</AdminActionLink><AdminActionLink tone="dark" href="/admin/content/planner">콘텐츠 플래너</AdminActionLink></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="처리 대기" value={query.data.stats.pending} /><Metric label="검토 필요" value={query.data.stats.needsReview} /><Metric label="완료" value={query.data.stats.completed} /><Metric label="실패" value={query.data.stats.failed} /></div></div>
    </AdminSurface>
    {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}{message && <AdminNotice tone="success">{message}</AdminNotice>}
    {reviewable.length > 0 && <AdminSurface tone="white" className="rounded-2xl p-4"><label className="text-sm font-bold">검토할 재평가 요청<select value={state?.actionKey ?? ""} onChange={(event) => { setSelectedActionKey(event.target.value); setSelectedItemId(null); }} className="mt-2 block min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal">{reviewable.map((candidate) => <option key={candidate.actionKey} value={candidate.actionKey}>{candidate.topicSpecId} · {candidate.candidateSet?.items.length ?? 0}개 후보</option>)}</select></label></AdminSurface>}
    {!item ? <QueueOverview states={query.data.states} onRetry={retry} loading={mutation.loading} /> : <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><AdminPill tone="white">{topic?.label ?? state?.topicSpecId}</AdminPill><AdminPill tone="white">{item.rank}위</AdminPill><AdminPill tone="white">남음 {incompleteItems.length}건</AdminPill></div><span className="text-xs text-slate-400">재정렬 {item.rerankScore.toFixed(4)}</span></div>
      <h2 className="mt-5 text-lg font-bold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.headingPath.join(" › ")}</p><blockquote className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7">{item.excerpt}</blockquote>{item.path && <a href={item.path} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">원문 열기 <ExternalLink className="h-4 w-4" /></a>}
      <fieldset className="mt-7"><legend className="text-sm font-bold">주제 관련성</legend><div className="mt-3 flex flex-wrap gap-2">{TOPIC_LABELS.map((option) => <button key={option.value} type="button" onClick={() => updateDraft({ topicReviewLabel: option.value })} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${draft?.topicReviewLabel === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}>{option.label}</button>)}</div></fieldset>
      <div className="mt-7 space-y-4">{item.conceptIds.map((conceptId) => { const concept = topic?.concepts.find((candidate) => candidate.id === conceptId); return <fieldset key={conceptId} className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-bold">{concept?.label ?? conceptId}</legend><p className="mb-3 text-xs text-slate-500">{concept?.description}</p><div className="flex flex-wrap gap-2">{CONCEPT_LABELS.map((option) => <button key={option.value} type="button" onClick={() => updateDraft({ conceptLabels: { ...draft?.conceptLabels, [conceptId]: option.value } })} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${draft?.conceptLabels[conceptId] === option.value ? "border-[var(--color-primary)] bg-blue-50 text-blue-900" : "border-slate-200"}`}>{option.label}</button>)}</div></fieldset>; })}</div>
      <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} rows={3} onChange={(event) => updateDraft({ notes: event.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" /></label><div className="mt-5 flex justify-end"><AdminActionButton tone="primary" disabled={!canSave || mutation.loading} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton></div>
    </AdminSurface>}
  </div>;
}

function QueueOverview({ states, onRetry, loading }: { states: ContentReevaluationState[]; onRetry: (actionKey: string) => void; loading: boolean }) {
  if (states.length === 0) return <AdminSurface tone="white" className="rounded-3xl p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 font-bold">재평가 요청이 없습니다.</h2></AdminSurface>;
  return <div className="grid gap-3 xl:grid-cols-2">{states.map((state) => <AdminSurface key={state.actionKey} tone="white" className="rounded-2xl p-5"><div className="flex flex-wrap items-center gap-2"><AdminPill tone="white">{state.topicSpecId ?? "주제 미지정"}</AdminPill><AdminPill tone="white">{statusLabel(state.status)}</AdminPill></div><p className="mt-3 text-sm text-slate-600">{state.reason}</p>{state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}{state.status === "failed" && <AdminActionButton tone="dark" className="mt-3" disabled={loading} onClick={() => onRetry(state.actionKey)}><RefreshCw className="h-4 w-4" />다시 대기열로</AdminActionButton>}</AdminSurface>)}</div>;
}

function statusLabel(status: ContentReevaluationState["status"]) {
  return ({ "awaiting-content-change": "변경 확인 필요", "pending-evidence-refresh": "워커 대기", processing: "처리 중", "needs-review": "검토 필요", completed: "완료", failed: "실패", cancelled: "취소" } as const)[status];
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-24 rounded-2xl bg-slate-50 px-3 py-3 text-center"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>;
}
