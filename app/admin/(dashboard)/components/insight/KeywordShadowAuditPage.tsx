"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, EyeOff } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import type {
  EvaluationAction,
  EvaluationPurpose,
  EvaluationRelevance,
  HumanEvaluationLabel,
} from "@/lib/keyword-candidate-evaluation";
import type {
  KeywordShadowAuditItem,
  KeywordShadowAuditTaxonomyOption,
} from "@/lib/keyword-candidate-shadow-audit-store";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/keyword-candidate-shadow-audit";
const PURPOSE_LABELS: Record<EvaluationPurpose, string> = {
  taxonomy: "택소노미", content: "콘텐츠", faq: "FAQ", product: "제품", local: "지역",
  noise: "노이즈", unknown: "미정",
};
const ACTION_LABELS: Record<EvaluationAction, string> = {
  approve: "승인", defer: "보류", reject: "제외", reclassify: "분류 위치 지정", review: "추가 검토",
};

type AuditResponse = {
  schemaVersion: number;
  engineVersion: string;
  snapshotId: string;
  snapshotCreatedAt: string;
  taxonomyVersion: number | null;
  generatedAt: string;
  items: KeywordShadowAuditItem[];
  taxonomy: KeywordShadowAuditTaxonomyOption[];
  stats: { total: number; labeled: number; remaining: number };
};
type Draft = {
  relevance: EvaluationRelevance | null;
  purpose: EvaluationPurpose | null;
  action: EvaluationAction | null;
  category: KeywordCategorySlug | null;
  subgroup: string | null;
  notes: string;
};

function initialDraft(item: KeywordShadowAuditItem): Draft {
  if (!item.humanLabel) return { relevance: null, purpose: null, action: null, category: null, subgroup: null, notes: "" };
  return {
    relevance: item.humanLabel.relevance,
    purpose: item.humanLabel.purpose,
    action: item.humanLabel.action,
    category: item.humanLabel.category,
    subgroup: item.humanLabel.subgroup,
    notes: item.humanLabel.notes,
  };
}

export function KeywordShadowAuditPage() {
  const query = useAdminApi<AuditResponse>(ENDPOINT);
  const mutation = useAdminMutation<{ id: string; humanLabel: HumanEvaluationLabel }>();
  const [show, setShow] = useState<"remaining" | "all">("remaining");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const filtered = useMemo(() => items.filter((item) => show === "all" || item.humanLabel == null), [items, show]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const draft = selected ? drafts[selected.id] ?? initialDraft(selected) : null;
  const selectedCategory = query.data?.taxonomy.find((category) => category.slug === draft?.category) ?? null;
  const canSave = Boolean(
    draft?.relevance
    && draft.purpose
    && draft.action
    && (draft.purpose !== "taxonomy" || (draft.category && draft.subgroup)),
  );

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="독립 감사 큐를 불러올 수 없습니다." />;
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
      setSavedMessage(`‘${selected.keyword}’ 독립 판단을 저장했습니다.`);
      setSelectedId(nextId);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="warning">독립 검증</AdminPill>
            <h1 className="mt-3 text-xl font-bold">그림자 추천 상위 100개를 감사합니다.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">기존 300개와 겹치지 않는 목적별 상위 후보입니다. 판단 편향을 줄이기 위해 저장 전에는 모델의 예상 결과를 보여주지 않습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="dark" href="/admin/content/trends/keyword-evaluation"><ArrowLeft className="h-4 w-4" />초기 평가 300개</AdminActionLink>
              <AdminActionLink tone="dark" href="/admin/content/trends">검색 트렌드로</AdminActionLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="전체" value={stats.total} />
            <Metric label="완료" value={stats.labeled} />
            <Metric label="남음" value={stats.remaining} />
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`독립 감사 진행률 ${stats.labeled}/${stats.total}`}>
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${stats.total ? stats.labeled / stats.total * 100 : 0}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">{query.data.engineVersion} · 택소노미 v{query.data.taxonomyVersion ?? "code"} · 스냅샷 {new Date(query.data.snapshotCreatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setShow("remaining"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "remaining" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>미완료만</button>
          <button type="button" onClick={() => { setShow("all"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>전체 보기</button>
        </div>
      </AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {savedMessage && <AdminNotice tone="success">{savedMessage}</AdminNotice>}

      {!selected ? (
        <AdminSurface tone="white" className="rounded-3xl p-10 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
          <h2 className="mt-3 font-bold">독립 감사 라벨링이 끝났습니다.</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">전체 보기에서 판단과 모델 예측을 다시 비교할 수 있습니다.</p>
        </AdminSurface>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2"><AdminPill tone="white">독립 감사</AdminPill>{selected.humanLabel && <AdminPill tone="warning">검토 완료</AdminPill>}</div>
              <span className="text-xs text-slate-400">월 {selected.monthlyVolume.toLocaleString("ko-KR")}회</span>
            </div>
            <h2 className="mt-5 text-2xl font-bold">{selected.keyword}</h2>

            <ChoiceGroup title="관련성" value={draft?.relevance} options={[["relevant", "관련"], ["uncertain", "불확실"], ["irrelevant", "무관"]]} onChange={(value) => {
              const relevance = value as EvaluationRelevance;
              if (relevance === "irrelevant") updateDraft({ relevance, purpose: "noise", action: "reject", category: null, subgroup: null });
              else if (relevance === "uncertain") updateDraft({ relevance, purpose: "unknown", action: "review", category: null, subgroup: null });
              else updateDraft({ relevance });
            }} />
            <ChoiceGroup title="활용 목적" value={draft?.purpose} options={Object.entries(PURPOSE_LABELS)} onChange={(value) => {
              const purpose = value as EvaluationPurpose;
              updateDraft({ purpose, ...(purpose === "taxonomy" ? {} : { category: null, subgroup: null }) });
            }} />
            <ChoiceGroup title="최종 조치" value={draft?.action} options={Object.entries(ACTION_LABELS)} onChange={(value) => updateDraft({ action: value as EvaluationAction })} />

            <fieldset className="mt-7">
              <legend className="text-sm font-bold">분류 위치 <span className="font-normal text-slate-400">(택소노미 목적은 필수)</span></legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <select aria-label="카테고리" value={draft?.category ?? ""} onChange={(event) => updateDraft({ category: event.target.value ? event.target.value as KeywordCategorySlug : null, subgroup: null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">선택 안 함</option>{query.data.taxonomy.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select>
                <select aria-label="서브그룹" value={draft?.subgroup ?? ""} disabled={!selectedCategory} onChange={(event) => updateDraft({ subgroup: event.target.value || null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"><option value="">선택 안 함</option>{selectedCategory?.subgroups.map((subgroup) => <option key={subgroup} value={subgroup}>{subgroup}</option>)}</select>
              </div>
            </fieldset>
            <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" placeholder="경계 사례나 판단 근거를 기록하세요." /></label>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2"><AdminActionButton tone="dark" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" />이전</AdminActionButton><AdminActionButton tone="dark" disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)}>다음<ArrowRight className="h-4 w-4" /></AdminActionButton></div>
              <AdminActionButton tone="primary" disabled={mutation.loading || !canSave} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton>
            </div>
          </AdminSurface>

          <aside className="space-y-4">
            {!selected.humanLabel ? (
              <AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><EyeOff className="h-5 w-5 text-slate-400" /><h3 className="mt-3 font-bold text-slate-900">모델 판단 숨김</h3><p className="mt-2 text-xs leading-5">사람의 독립 판단을 먼저 저장하면 모델의 예상 목적과 분류 위치를 공개합니다.</p></AdminSurface>
            ) : (
              <AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">모델 판단 비교</h3><dl className="mt-4 space-y-3 text-sm"><Info label="예상 목적" value={PURPOSE_LABELS[selected.predictedPurpose]} /><Info label="예상 조치" value={ACTION_LABELS[selected.predictedAction]} /><Info label="목적 내 순위" value={`${selected.purposeRank}위`} /><Info label="관련성 신뢰도" value={`${Math.round(selected.relevanceConfidence * 100)}%`} /><Info label="목적 신뢰도" value={`${Math.round(selected.purposeConfidence * 100)}%`} /><Info label="분류 후보" value={selected.taxonomyCandidates.map((candidate) => `${candidate.category} / ${candidate.subgroup}`).join(" · ")} /></dl></AdminSurface>
            )}
            <AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><p><strong className="text-slate-900">현재 위치</strong> {selectedIndex + 1} / {filtered.length}</p><p className="mt-3 text-xs leading-5">검색량이나 익숙한 표현보다 실제 치과 관련성과 서울본치과에서 활용할 수 있는 검색 의도를 기준으로 판단하세요.</p></AdminSurface>
          </aside>
        </div>
      )}
    </div>
  );
}

function ChoiceGroup({ title, value, options, onChange }: { title: string; value?: string | null; options: string[][]; onChange: (value: string) => void }) {
  return <fieldset className="mt-7"><legend className="text-sm font-bold">{title}</legend><div className="mt-3 flex flex-wrap gap-2">{options.map(([option, label]) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${value === option ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : "border-slate-200 text-slate-600"}`}>{label}</button>)}</div></fieldset>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 break-words font-medium text-slate-800">{value}</dd></div>; }
