"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import type { KeywordBoundaryReviewItem } from "@/lib/keyword-candidate-boundary-review-store";
import type { KeywordShadowAuditTaxonomyOption } from "@/lib/keyword-candidate-shadow-audit-store";
import type {
  EvaluationAction,
  EvaluationPurpose,
  EvaluationRelevance,
  HumanEvaluationLabel,
} from "@/lib/keyword-candidate-evaluation";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/keyword-candidate-boundary-review";
const PURPOSE_LABELS: Record<EvaluationPurpose, string> = {
  taxonomy: "택소노미", content: "콘텐츠", faq: "FAQ", product: "제품", local: "지역",
  noise: "노이즈", unknown: "미정",
};
const ACTION_LABELS: Record<EvaluationAction, string> = {
  approve: "승인", defer: "보류", reject: "제외", reclassify: "분류 위치 지정", review: "추가 검토",
};

interface BoundaryResponse {
  engineVersion: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: KeywordBoundaryReviewItem[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
  stats: { total: number; labeled: number; remaining: number; preReviewed: number };
}

interface Draft {
  relevance: EvaluationRelevance;
  purpose: EvaluationPurpose;
  action: EvaluationAction;
  category: KeywordCategorySlug | null;
  subgroup: string | null;
  notes: string;
}

type ConfirmResult = { confirmed: number; preserved: number; total: number; confirmedAt: string };

function initialDraft(item: KeywordBoundaryReviewItem): Draft {
  const reviewed = item.humanLabel ?? item.preReview;
  if (reviewed) return {
    relevance: reviewed.relevance,
    purpose: reviewed.purpose,
    action: reviewed.action,
    category: reviewed.category,
    subgroup: reviewed.subgroup,
    notes: reviewed.notes,
  };
  const top = item.taxonomyCandidates[0];
  return {
    relevance: item.predictedRelevance,
    purpose: item.predictedPurpose,
    action: item.predictedAction,
    category: item.predictedPurpose === "taxonomy" ? top?.category ?? null : null,
    subgroup: item.predictedPurpose === "taxonomy" ? top?.subgroup ?? null : null,
    notes: "",
  };
}

export function KeywordBoundaryReviewPage() {
  const query = useAdminApi<BoundaryResponse>(ENDPOINT);
  const mutation = useAdminMutation<{ id: string; humanLabel: HumanEvaluationLabel }>();
  const confirmation = useAdminMutation<ConfirmResult>();
  const [show, setShow] = useState<"remaining" | "all">("remaining");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const filtered = useMemo(() => items.filter((item) => show === "all" || !item.humanLabel), [items, show]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const draft = selected ? drafts[selected.id] ?? initialDraft(selected) : null;
  const selectedCategory = query.data?.taxonomy.find((category) => category.slug === draft?.category) ?? null;
  const canSave = Boolean(draft && (draft.purpose !== "taxonomy" || (draft.category && draft.subgroup)));

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="경계 검토 큐를 불러올 수 없습니다." />;
  const stats = query.data.stats;

  const updateDraft = (updates: Partial<Draft>) => {
    if (!selected || !draft) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...updates } }));
  };
  const move = (offset: number) => {
    const next = filtered[selectedIndex + offset];
    if (next) { setSelectedId(next.id); setSavedMessage(null); }
  };
  const save = async () => {
    if (!selected || !draft || !canSave) return;
    const nextId = filtered[selectedIndex + 1]?.id ?? filtered[selectedIndex - 1]?.id ?? null;
    const result = await mutation.mutate(ENDPOINT, "PATCH", { id: selected.id, ...draft });
    if (!result.error) {
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next; });
      setSavedMessage(`‘${selected.keyword}’ 경계 판단을 저장했습니다.`);
      setSelectedId(nextId);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><AdminPill tone="warning">선택 검토</AdminPill><AdminPill tone="white">최대 30개</AdminPill></div>
            <h1 className="mt-3 text-xl font-bold">판단이 엇갈리는 키워드만 검토합니다.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">관련성·목적 신뢰도가 낮거나 제품/지역 신호와 추천 목적이 충돌한 사례입니다. 모델 판단을 초안으로 제공하며 자동 승인이나 자동 제외에는 사용하지 않습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="dark" href="/admin/content/trends/keyword-evaluation/shadow-audit"><ArrowLeft className="h-4 w-4" />고정 홀드아웃</AdminActionLink>
              <AdminActionLink tone="dark" href="/admin/content/trends">검색 트렌드로</AdminActionLink>
              {stats.preReviewed === stats.total && stats.remaining > 0 && <AdminActionButton tone="primary" disabled={confirmation.loading} onClick={async () => {
                if (!window.confirm(`사전 검토 ${stats.preReviewed}개를 일괄 확정할까요? 직접 저장한 항목은 유지됩니다.`)) return;
                const result = await confirmation.mutate(ENDPOINT, "POST", { action: "confirm-pre-reviews" });
                if (!result.error && result.data) setSavedMessage(`사전 검토 ${result.data.confirmed}개를 확정했습니다.${result.data.preserved ? ` 직접 검토 ${result.data.preserved}개는 유지했습니다.` : ""}`);
              }}>{confirmation.loading ? "확정 중…" : "사전 검토 일괄 확정"}</AdminActionButton>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center"><Metric label="전체" value={stats.total} /><Metric label="완료" value={stats.labeled} /><Metric label="남음" value={stats.remaining} /></div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${stats.total ? stats.labeled / stats.total * 100 : 0}%` }} /></div>
        <p className="mt-2 text-xs text-slate-400">사전 검토 {stats.preReviewed}개 · {query.data.engineVersion} · 택소노미 v{query.data.taxonomyVersion ?? "code"} · 생성 {new Date(query.data.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-5"><div className="flex flex-wrap gap-2"><FilterButton active={show === "remaining"} onClick={() => { setShow("remaining"); setSelectedId(null); }}>미완료만</FilterButton><FilterButton active={show === "all"} onClick={() => { setShow("all"); setSelectedId(null); }}>전체 보기</FilterButton></div></AdminSurface>
      {(mutation.error || confirmation.error) && <AdminNotice tone="error">{mutation.error ?? confirmation.error}</AdminNotice>}
      {savedMessage && <AdminNotice tone="success">{savedMessage}</AdminNotice>}

      {!selected ? (
        <AdminSurface tone="white" className="rounded-3xl p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 font-bold">경계 사례 검토가 끝났습니다.</h2><p className="mt-1 text-sm text-[var(--muted)]">새로운 저신뢰 사례가 누적될 때만 다시 확인하면 됩니다.</p></AdminSurface>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><AdminPill tone="white">경계 사례</AdminPill>{selected.preReview && !selected.humanLabel && <AdminPill tone="white">사전 검토안</AdminPill>}{selected.humanLabel && <AdminPill tone="warning">검토 완료</AdminPill>}</div><span className="text-xs text-slate-400">월 {selected.monthlyVolume.toLocaleString("ko-KR")}회</span></div>
            <h2 className="mt-5 text-2xl font-bold">{selected.keyword}</h2>
            <ChoiceGroup title="관련성" value={draft?.relevance} options={[["relevant", "관련"], ["uncertain", "불확실"], ["irrelevant", "무관"]]} onChange={(value) => {
              const relevance = value as EvaluationRelevance;
              if (relevance === "irrelevant") updateDraft({ relevance, purpose: "noise", action: "reject", category: null, subgroup: null });
              else if (relevance === "uncertain") updateDraft({ relevance, purpose: "unknown", action: "review", category: null, subgroup: null });
              else updateDraft({ relevance });
            }} />
            <ChoiceGroup title="활용 목적" value={draft?.purpose} options={Object.entries(PURPOSE_LABELS)} onChange={(value) => { const purpose = value as EvaluationPurpose; updateDraft({ purpose, ...(purpose === "taxonomy" ? {} : { category: null, subgroup: null }) }); }} />
            <ChoiceGroup title="최종 조치" value={draft?.action} options={Object.entries(ACTION_LABELS)} onChange={(value) => updateDraft({ action: value as EvaluationAction })} />
            <fieldset className="mt-7"><legend className="text-sm font-bold">분류 위치 <span className="font-normal text-slate-400">(택소노미 목적은 필수)</span></legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><select aria-label="카테고리" value={draft?.category ?? ""} onChange={(event) => updateDraft({ category: event.target.value ? event.target.value as KeywordCategorySlug : null, subgroup: null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">선택 안 함</option>{query.data.taxonomy.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select><select aria-label="서브그룹" value={draft?.subgroup ?? ""} disabled={!selectedCategory} onChange={(event) => updateDraft({ subgroup: event.target.value || null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"><option value="">선택 안 함</option>{selectedCategory?.subgroups.map((subgroup) => <option key={subgroup} value={subgroup}>{subgroup}</option>)}</select></div></fieldset>
            <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" /></label>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><AdminActionButton tone="dark" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" />이전</AdminActionButton><AdminActionButton tone="dark" disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)}>다음<ArrowRight className="h-4 w-4" /></AdminActionButton></div><AdminActionButton tone="primary" disabled={mutation.loading || !canSave} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton></div>
          </AdminSurface>

          <aside className="space-y-4">
            <AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">검토가 필요한 이유</h3><div className="mt-3 flex flex-wrap gap-2">{selected.reasons.map((reason) => <AdminPill key={reason} tone="warning">{reason}</AdminPill>)}</div></AdminSurface>
            <AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">모델 초안</h3><dl className="mt-4 space-y-3 text-sm"><Info label="관련성" value={`${selected.predictedRelevance} · ${Math.round(selected.relevanceConfidence * 100)}%`} /><Info label="목적" value={`${PURPOSE_LABELS[selected.predictedPurpose]} · ${Math.round(selected.purposeConfidence * 100)}%`} /><Info label="조치" value={ACTION_LABELS[selected.predictedAction]} /><Info label="분류 후보" value={selected.taxonomyCandidates.map((candidate) => `${candidate.category} / ${candidate.subgroup}`).join(" · ")} /></dl></AdminSurface>
            <AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><strong className="text-slate-900">현재 위치</strong> {selectedIndex + 1} / {filtered.length}</AdminSurface>
          </aside>
        </div>
      )}
    </div>
  );
}

function ChoiceGroup({ title, value, options, onChange }: { title: string; value?: string | null; options: string[][]; onChange: (value: string) => void }) { return <fieldset className="mt-7"><legend className="text-sm font-bold">{title}</legend><div className="mt-3 flex flex-wrap gap-2">{options.map(([option, label]) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${value === option ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : "border-slate-200 text-slate-600"}`}>{label}</button>)}</div></fieldset>; }
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>{children}</button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 break-words font-medium text-slate-800">{value}</dd></div>; }
