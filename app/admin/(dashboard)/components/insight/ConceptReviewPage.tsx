"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { ConceptReviewItem, ConceptReviewSeed, ConceptSupportLabel } from "@/lib/content-coverage/concept-review";
import type { RetrievalReviewLabel } from "@/lib/content-coverage/retrieval-evaluation";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/content-coverage/concept-review";
type TopicLabel = Exclude<RetrievalReviewLabel, null>;
type ReviewItem = ConceptReviewItem & { updatedAt?: string; updatedBy?: string };
type TopicContext = { id: string; label: string; description: string; concepts: Array<{ id: string; label: string; description: string }> };
type ReviewDraft = { topicReviewLabel: TopicLabel | null; conceptLabels: Record<string, ConceptSupportLabel | null>; notes: string };
type ReviewResponse = {
  review: Omit<ConceptReviewSeed, "items"> & { items: ReviewItem[] };
  topics: TopicContext[];
  stats: { total: number; complete: number; remaining: number; conceptTotal: number; conceptComplete: number };
};

const TOPIC_LABELS: Array<{ value: TopicLabel; label: string }> = [
  { value: "relevant", label: "관련" },
  { value: "partial", label: "부분 관련" },
  { value: "irrelevant", label: "무관" },
];
const CONCEPT_LABELS: Array<{ value: ConceptSupportLabel; label: string; description: string }> = [
  { value: "supports", label: "충족", description: "이 문단만으로 개념의 판정 기준을 직접 뒷받침" },
  { value: "partial", label: "부분 충족", description: "일부 기준이나 보조 설명만 제공" },
  { value: "not-supported", label: "미충족", description: "표현만 겹치고 이 개념의 근거로 사용할 수 없음" },
];

function isComplete(item: ReviewItem) {
  return item.topicReviewLabel != null && item.conceptIds.every((conceptId) => item.conceptLabels[conceptId] != null);
}

export function ConceptReviewPage() {
  const query = useAdminApi<ReviewResponse>(ENDPOINT);
  const mutation = useAdminMutation();
  const [topicId, setTopicId] = useState("all");
  const [show, setShow] = useState<"remaining" | "all">("remaining");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = useMemo(() => query.data?.review.items ?? [], [query.data]);
  const filtered = useMemo(() => items.filter((item) =>
    (topicId === "all" || item.topicSpecId === topicId) && (show === "all" || !isComplete(item))), [items, show, topicId]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const topic = query.data?.topics.find((entry) => entry.id === selected?.topicSpecId) ?? null;
  const draft = selected ? drafts[selected.id] ?? {
    topicReviewLabel: selected.topicReviewLabel,
    conceptLabels: selected.conceptLabels,
    notes: selected.notes,
  } : null;

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="개념 검토 후보를 불러올 수 없습니다." />;

  const move = (offset: number) => {
    const next = filtered[selectedIndex + offset];
    if (next) { setSelectedId(next.id); setSavedMessage(null); }
  };
  const updateDraft = (updates: Partial<ReviewDraft>) => {
    if (!selected || !draft) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...updates } }));
  };
  const canSave = Boolean(draft?.topicReviewLabel && selected?.conceptIds.every((conceptId) => draft.conceptLabels[conceptId] != null));
  const save = async () => {
    if (!selected || !draft?.topicReviewLabel || !canSave) return;
    const nextId = filtered[selectedIndex + 1]?.id ?? filtered[selectedIndex - 1]?.id ?? null;
    const conceptLabels = Object.fromEntries(selected.conceptIds.map((conceptId) => [conceptId, draft.conceptLabels[conceptId]])) as Record<string, ConceptSupportLabel>;
    const result = await mutation.mutate(ENDPOINT, "PATCH", { id: selected.id, topicReviewLabel: draft.topicReviewLabel, conceptLabels, notes: draft.notes.trim() });
    if (!result.error) {
      setSavedMessage(`${selected.topicLabel} ${selected.rank}위 개념 판정을 저장했습니다.`);
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next; });
      setSelectedId(nextId);
      await query.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="white">개념별 근거 검토</AdminPill>
            <h1 className="mt-3 text-xl font-bold">재정렬 후보가 어떤 개념을 실제로 충족하는지 판정합니다.</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">주제 관련성과 개념 충족은 별도 판단입니다. 기존 주제 라벨은 이어받았으며 개념별 근거 수준을 추가로 검토합니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="dark" href="/admin/content/strategy/retrieval-review"><ArrowLeft className="h-4 w-4" />기존 검색 라벨</AdminActionLink>
              <AdminActionLink tone="dark" href="/admin/content/strategy">기회 분석으로</AdminActionLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="후보" value={`${query.data.stats.complete}/${query.data.stats.total}`} />
            <Metric label="개념 판정" value={`${query.data.stats.conceptComplete}/${query.data.stats.conceptTotal}`} />
            <Metric label="남음" value={query.data.stats.remaining} />
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${query.data.stats.total ? query.data.stats.complete / query.data.stats.total * 100 : 0}%` }} /></div>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-5"><div className="flex flex-wrap gap-2">
        <select aria-label="검토 주제" value={topicId} onChange={(event) => { setTopicId(event.target.value); setSelectedId(null); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">전체 주제</option>{query.data.topics.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select>
        <button onClick={() => { setShow("remaining"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "remaining" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>미완료만</button>
        <button onClick={() => { setShow("all"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>전체 보기</button>
      </div></AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {savedMessage && <AdminNotice tone="success">{savedMessage}</AdminNotice>}
      {!selected ? <AdminSurface tone="white" className="rounded-3xl p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 font-bold">선택한 범위의 개념 검토가 끝났습니다.</h2></AdminSurface> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><AdminPill tone="white">{selected.topicLabel}</AdminPill><AdminPill tone="white">재정렬 {selected.rank}위</AdminPill><AdminPill tone={selected.evidenceLevel === "direct" ? "sky" : "warning"}>{selected.evidenceLevel}</AdminPill>{isComplete(selected) && <AdminPill tone="warning">검토 완료</AdminPill>}</div><span className="text-xs text-slate-400">재정렬 점수 {selected.rerankScore.toFixed(4)}</span></div>
            <h2 className="mt-5 text-lg font-bold">{selected.title}</h2><p className="mt-1 text-xs text-slate-500">{selected.headingPath.join(" › ")}</p>
            <blockquote className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-800">{selected.excerpt}</blockquote>
            {selected.path && <a href={selected.path} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">원문 열기 <ExternalLink className="h-3.5 w-3.5" /></a>}
            <fieldset className="mt-7"><legend className="text-sm font-bold">주제 관련성</legend><div className="mt-3 flex flex-wrap gap-2">{TOPIC_LABELS.map((option) => <button key={option.value} type="button" aria-pressed={draft?.topicReviewLabel === option.value} onClick={() => updateDraft({ topicReviewLabel: option.value })} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${draft?.topicReviewLabel === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}>{option.label}</button>)}</div></fieldset>
            <div className="mt-7 space-y-4"><h3 className="text-sm font-bold">개념별 충족 판정</h3>{selected.conceptIds.map((conceptId) => { const concept = topic?.concepts.find((entry) => entry.id === conceptId); return <fieldset key={conceptId} className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-bold">{concept?.label ?? conceptId}</legend><p className="mb-3 text-xs leading-5 text-slate-500">{concept?.description}</p><div className="grid gap-2 md:grid-cols-3">{CONCEPT_LABELS.map((option) => <button key={option.value} type="button" aria-pressed={draft?.conceptLabels[conceptId] === option.value} onClick={() => updateDraft({ conceptLabels: { ...draft?.conceptLabels, [conceptId]: option.value } })} className={`rounded-xl border p-3 text-left ${draft?.conceptLabels[conceptId] === option.value ? "border-[var(--color-primary)] bg-blue-50 ring-1 ring-[var(--color-primary)]" : "border-slate-200"}`}><strong className="text-xs">{option.label}</strong><span className="mt-1 block text-[11px] leading-4 text-slate-500">{option.description}</span></button>)}</div></fieldset>; })}</div>
            <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} placeholder="개념별 경계 사례나 판단 근거를 기록하세요." className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" /></label>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><AdminActionButton tone="dark" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" />이전</AdminActionButton><AdminActionButton tone="dark" disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)}>다음<ArrowRight className="h-4 w-4" /></AdminActionButton></div><AdminActionButton tone="primary" disabled={!canSave || mutation.loading} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton></div>
          </AdminSurface>
          <aside className="space-y-4"><AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">판정 원칙</h3><p className="mt-2 text-sm leading-6 text-slate-600">{topic?.description}</p><ul className="mt-4 space-y-2 text-xs leading-5 text-slate-500"><li>· 주제가 관련이어도 특정 개념은 미충족일 수 있습니다.</li><li>· 요약이나 짧은 언급은 부분 충족 또는 미충족으로 판단합니다.</li><li>· 문단에 없는 내용을 추론해서 충족으로 판정하지 않습니다.</li></ul></AdminSurface><AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><strong className="text-slate-900">현재 위치</strong> {selectedIndex + 1} / {filtered.length}</AdminSurface></aside>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-24 rounded-2xl bg-slate-50 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>;
}
