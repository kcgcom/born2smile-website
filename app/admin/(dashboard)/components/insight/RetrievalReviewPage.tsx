"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { RetrievalReasonTag, RetrievalReviewFile, RetrievalReviewItem, RetrievalReviewLabel } from "@/lib/content-coverage/retrieval-evaluation";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/content-coverage/retrieval-review";
type ReviewLabel = Exclude<RetrievalReviewLabel, null>;
type ReviewItem = RetrievalReviewItem & { updatedAt?: string; updatedBy?: string };
type TopicContext = { id: string; label: string; description: string; exclusions: string[]; concepts: string[] };
type ReviewDraft = { label: ReviewLabel | null; reasonTags: RetrievalReasonTag[]; notes: string };
type ReviewResponse = {
  review: Omit<RetrievalReviewFile, "items"> & { items: ReviewItem[] };
  topics: TopicContext[];
  stats: { total: number; labeled: number; remaining: number };
  reasonTags: RetrievalReasonTag[];
};

const LABELS: Array<{ value: ReviewLabel; label: string; description: string }> = [
  { value: "relevant", label: "관련", description: "질문에 직접 답하거나 핵심 개념을 충분히 설명" },
  { value: "partial", label: "부분 관련", description: "일부 개념만 설명하거나 보조 근거로 사용 가능" },
  { value: "irrelevant", label: "무관", description: "표현만 비슷하고 이 주제의 근거로 사용하기 어려움" },
];

const REASON_LABELS: Record<RetrievalReasonTag, string> = {
  "direct-answer": "직접 답변", "required-concept": "필수 개념", "supporting-concept": "보조 개념",
  "too-narrow": "범위가 너무 좁음", "brief-mention": "짧은 언급", "adjacent-topic": "인접 주제",
  "wrong-surface-context": "문맥 불일치", "wrong-treatment": "다른 진료", "wrong-patient": "대상 환자 불일치",
  "keyword-collision": "키워드 충돌", "incidental-mention": "우연한 언급", "promotional-only": "홍보성 문구",
};

export function RetrievalReviewPage() {
  const query = useAdminApi<ReviewResponse>(ENDPOINT);
  const mutation = useAdminMutation();
  const [topicId, setTopicId] = useState("all");
  const [show, setShow] = useState<"remaining" | "all">("remaining");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = useMemo(() => query.data?.review.items ?? [], [query.data]);
  const filtered = useMemo(() => items.filter((item) =>
    (topicId === "all" || item.topicSpecId === topicId) && (show === "all" || item.label == null)), [items, show, topicId]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const topic = query.data?.topics.find((entry) => entry.id === selected?.topicSpecId) ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const draft = selected ? drafts[selected.id] ?? {
    label: selected.label,
    reasonTags: selected.reasonTags.filter((tag): tag is RetrievalReasonTag => query.data?.reasonTags.includes(tag as RetrievalReasonTag) ?? false),
    notes: selected.notes,
  } : null;

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="검토 후보를 불러올 수 없습니다." />;

  const move = (offset: number) => {
    const next = filtered[selectedIndex + offset];
    if (next) { setSelectedId(next.id); setSavedMessage(null); }
  };

  const updateDraft = (updates: Partial<ReviewDraft>) => {
    if (!selected || !draft) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...updates } }));
  };

  const save = async () => {
    if (!selected || !draft?.label) return;
    const nextId = filtered[selectedIndex + 1]?.id ?? filtered[selectedIndex - 1]?.id ?? null;
    const result = await mutation.mutate(ENDPOINT, "PATCH", { id: selected.id, label: draft.label, reasonTags: draft.reasonTags, notes: draft.notes.trim() });
    if (!result.error) {
      setSavedMessage(`${selected.topicLabel} ${selected.rank}위 항목을 저장했습니다.`);
      setSelectedId(nextId);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="white">콘텐츠 근거 모델</AdminPill>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">임베딩 검색 결과를 라벨링합니다.</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">후보 문단이 주제를 실제로 뒷받침하는지 판단합니다. 유사도는 참고값이며 본문과 주제 범위를 우선해 주세요.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="dark" href="/admin/content/strategy"><ArrowLeft className="h-4 w-4" />기회 분석으로</AdminActionLink>
              <AdminActionLink tone="primary" href="/admin/content/strategy/concept-review">개념별 근거 검토</AdminActionLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="전체" value={query.data.stats.total} />
            <Metric label="완료" value={query.data.stats.labeled} />
            <Metric label="남음" value={query.data.stats.remaining} />
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`라벨링 진행률 ${query.data.stats.labeled}/${query.data.stats.total}`}>
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${query.data.stats.total ? query.data.stats.labeled / query.data.stats.total * 100 : 0}%` }} />
        </div>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-5">
        <div className="flex flex-wrap gap-2">
          <select aria-label="검토 주제" value={topicId} onChange={(event) => { setTopicId(event.target.value); setSelectedId(null); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">전체 주제</option>
            {query.data.topics.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
          <button onClick={() => { setShow("remaining"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "remaining" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>미완료만</button>
          <button onClick={() => { setShow("all"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>전체 보기</button>
        </div>
      </AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {savedMessage && <AdminNotice tone="success">{savedMessage}</AdminNotice>}

      {!selected ? (
        <AdminSurface tone="white" className="rounded-3xl p-10 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
          <h2 className="mt-3 font-bold">선택한 범위의 라벨링이 끝났습니다.</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">전체 보기로 기존 판단을 다시 검토할 수 있습니다.</p>
        </AdminSurface>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2"><AdminPill tone="white">{selected.topicLabel}</AdminPill><AdminPill tone="white">후보 {selected.rank}위</AdminPill>{selected.label && <AdminPill tone="warning">검토 완료</AdminPill>}</div>
              <span className="text-xs text-slate-400">유사도 {selected.similarity.toFixed(4)} · {selected.foundByLexical ? "규칙 검색 포함" : "임베딩 검색"}</span>
            </div>
            <h2 className="mt-5 text-lg font-bold">{selected.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{selected.headingPath.join(" › ")}</p>
            <blockquote className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-800">{selected.excerpt}</blockquote>
            {selected.path && <a href={selected.path} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">원문 열기 <ExternalLink className="h-3.5 w-3.5" /></a>}

            <fieldset className="mt-7"><legend className="text-sm font-bold">판정</legend><div className="mt-3 grid gap-3 md:grid-cols-3">{LABELS.map((option) => <button key={option.value} type="button" aria-pressed={draft?.label === option.value} onClick={() => updateDraft({ label: option.value })} className={`rounded-2xl border p-4 text-left ${draft?.label === option.value ? "border-[var(--color-primary)] bg-blue-50 ring-1 ring-[var(--color-primary)]" : "border-slate-200"}`}><strong className="text-sm">{option.label}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span></button>)}</div></fieldset>

            <fieldset className="mt-7"><legend className="text-sm font-bold">판단 사유 <span className="font-normal text-slate-400">(복수 선택)</span></legend><div className="mt-3 flex flex-wrap gap-2">{query.data.reasonTags.map((tag) => { const active = draft?.reasonTags.includes(tag) ?? false; return <button key={tag} type="button" aria-pressed={active} onClick={() => updateDraft({ reasonTags: active ? draft?.reasonTags.filter((entry) => entry !== tag) : [...(draft?.reasonTags ?? []), tag] })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>{REASON_LABELS[tag]}</button>; })}</div></fieldset>

            <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} placeholder="경계 사례나 판단 기준을 기록하세요." className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" /></label>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2"><AdminActionButton tone="dark" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" />이전</AdminActionButton><AdminActionButton tone="dark" disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)}>다음<ArrowRight className="h-4 w-4" /></AdminActionButton></div>
              <AdminActionButton tone="primary" disabled={!draft?.label || mutation.loading} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton>
            </div>
          </AdminSurface>

          <aside className="space-y-4">
            <AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">주제 판정 기준</h3><p className="mt-2 text-sm leading-6 text-slate-600">{topic?.description}</p><h4 className="mt-5 text-xs font-bold text-slate-500">평가 개념</h4><ul className="mt-2 space-y-1 text-sm text-slate-700">{topic?.concepts.map((concept) => <li key={concept}>· {concept}</li>)}</ul>{topic?.exclusions.length ? <><h4 className="mt-5 text-xs font-bold text-slate-500">제외 범위</h4><ul className="mt-2 space-y-1 text-sm text-slate-700">{topic.exclusions.map((exclusion) => <li key={exclusion}>· {exclusion}</li>)}</ul></> : null}</AdminSurface>
            <AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><p><strong className="text-slate-900">현재 위치</strong> {selectedIndex + 1} / {filtered.length}</p><p className="mt-2 text-xs leading-5">점수가 높아도 환자·진료·문맥이 다르면 무관으로 판단합니다. 짧지만 실제 개념을 설명하면 부분 관련으로 판단합니다.</p></AdminSurface>
          </aside>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>;
}
