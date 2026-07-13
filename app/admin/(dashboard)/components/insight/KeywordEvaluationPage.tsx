"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type {
  EvaluationAction,
  EvaluationPurpose,
  EvaluationRelevance,
  EvaluationStratum,
  HumanEvaluationLabel,
  KeywordEvaluationItem,
} from "@/lib/keyword-candidate-evaluation";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/keyword-candidate-evaluation";
const STRATUM_LABELS: Record<EvaluationStratum, string> = {
  "current-surface": "현재 노출", "cap-hidden": "상위 5개 밖", "lexical-low-volume": "저검색량",
  "lexical-missed": "문자열 미매칭", "product-brand": "제품·브랜드", "local-regional": "지역",
  "noise-uncertain": "노이즈 후보",
};
const PURPOSE_LABELS: Record<EvaluationPurpose, string> = {
  taxonomy: "택소노미", content: "콘텐츠", faq: "FAQ", product: "제품", local: "지역",
  noise: "노이즈", unknown: "미정",
};
const ACTION_LABELS: Record<EvaluationAction, string> = {
  approve: "승인", defer: "보류", reject: "제외", reclassify: "재분류", review: "추가 검토",
};

type TaxonomyOption = { slug: KeywordCategorySlug; label: string; subgroups: string[] };
type EvaluationResponse = {
  schemaVersion: number;
  taxonomyVersion: number | null;
  snapshotId: string;
  snapshotCreatedAt: string;
  items: KeywordEvaluationItem[];
  taxonomy: TaxonomyOption[];
  stats: { total: number; labeled: number; remaining: number };
};
type Draft = Omit<HumanEvaluationLabel, "updatedAt" | "updatedBy">;

function initialDraft(item: KeywordEvaluationItem): Draft {
  if (item.humanLabel) {
    return {
      relevance: item.humanLabel.relevance,
      purpose: item.humanLabel.purpose,
      action: item.humanLabel.action,
      category: item.humanLabel.category,
      subgroup: item.humanLabel.subgroup,
      notes: item.humanLabel.notes,
    };
  }
  return {
    relevance: item.autoLabel.relevance,
    purpose: item.autoLabel.purpose,
    action: item.autoLabel.action,
    category: item.lexicalCategory,
    subgroup: item.lexicalSubgroup,
    notes: "",
  };
}

export function KeywordEvaluationPage() {
  const query = useAdminApi<EvaluationResponse>(ENDPOINT);
  const mutation = useAdminMutation<{ id: string; humanLabel: HumanEvaluationLabel }>();
  const [stratum, setStratum] = useState<EvaluationStratum | "all">("all");
  const [show, setShow] = useState<"remaining" | "all">("remaining");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const filtered = useMemo(() => items.filter((item) =>
    (stratum === "all" || item.stratum === stratum) && (show === "all" || item.humanLabel == null)), [items, show, stratum]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;
  const draft = selected ? drafts[selected.id] ?? initialDraft(selected) : null;
  const selectedCategory = query.data?.taxonomy.find((category) => category.slug === draft?.category) ?? null;

  if (query.loading) return <AdminLoadingSkeleton variant="full" />;
  if (query.error) return <AdminErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <AdminErrorState message="키워드 평가 데이터를 불러올 수 없습니다." />;

  const updateDraft = (updates: Partial<Draft>) => {
    if (!selected || !draft) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ...updates } }));
  };
  const move = (offset: number) => {
    const next = filtered[selectedIndex + offset];
    if (next) { setSelectedId(next.id); setSavedMessage(null); }
  };
  const save = async () => {
    if (!selected || !draft) return;
    const nextId = filtered[selectedIndex + 1]?.id ?? filtered[selectedIndex - 1]?.id ?? null;
    const result = await mutation.mutate(ENDPOINT, "PATCH", { id: selected.id, ...draft });
    if (!result.error) {
      setDrafts((current) => { const next = { ...current }; delete next[selected.id]; return next; });
      setSavedMessage(`‘${selected.keyword}’ 판단을 저장했습니다.`);
      setSelectedId(nextId);
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="white">추천 모델 평가</AdminPill>
            <h1 className="mt-3 text-xl font-bold">연관 키워드 300개를 라벨링합니다.</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">자동 판단을 출발점으로 관련성·활용 목적·최종 조치를 확인하세요. 이 결과는 평가용이며 현재 후보와 택소노미를 직접 변경하지 않습니다.</p>
            <div className="mt-4"><AdminActionLink tone="dark" href="/admin/content/trends"><ArrowLeft className="h-4 w-4" />검색 트렌드로</AdminActionLink></div>
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
        <p className="mt-2 text-xs text-slate-400">택소노미 v{query.data.taxonomyVersion ?? "code"} · 스냅샷 {new Date(query.data.snapshotCreatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-5">
        <div className="flex flex-wrap gap-2">
          <select aria-label="평가 표본 구간" value={stratum} onChange={(event) => { setStratum(event.target.value as EvaluationStratum | "all"); setSelectedId(null); }} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">전체 표본</option>
            {Object.entries(STRATUM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => { setShow("remaining"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "remaining" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>미완료만</button>
          <button type="button" onClick={() => { setShow("all"); setSelectedId(null); }} className={`min-h-10 rounded-xl px-3 text-sm font-semibold ${show === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>전체 보기</button>
        </div>
      </AdminSurface>

      {mutation.error && <AdminNotice tone="error">{mutation.error}</AdminNotice>}
      {savedMessage && <AdminNotice tone="success">{savedMessage}</AdminNotice>}

      {!selected ? (
        <AdminSurface tone="white" className="rounded-3xl p-10 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 font-bold">선택한 범위의 라벨링이 끝났습니다.</h2><p className="mt-1 text-sm text-[var(--muted)]">전체 보기에서 저장한 판단을 다시 수정할 수 있습니다.</p></AdminSurface>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><AdminPill tone="white">{STRATUM_LABELS[selected.stratum]}</AdminPill>{selected.humanLabel && <AdminPill tone="warning">검토 완료</AdminPill>}</div><span className="text-xs text-slate-400">월 {selected.monthlyVolume.toLocaleString("ko-KR")}회 · 문자열 점수 {selected.lexicalScore.toFixed(2)}</span></div>
            <h2 className="mt-5 text-2xl font-bold">{selected.keyword}</h2>
            <p className="mt-2 text-sm text-slate-500">자동 판단: {PURPOSE_LABELS[selected.autoLabel.purpose]} · {ACTION_LABELS[selected.autoLabel.action]} · {selected.autoLabel.reasons.join(" · ")}</p>

            <ChoiceGroup title="관련성" value={draft?.relevance} options={[["relevant", "관련"], ["uncertain", "불확실"], ["irrelevant", "무관"]]} onChange={(value) => updateDraft({ relevance: value as EvaluationRelevance })} />
            <ChoiceGroup title="활용 목적" value={draft?.purpose} options={Object.entries(PURPOSE_LABELS)} onChange={(value) => updateDraft({ purpose: value as EvaluationPurpose })} />
            <ChoiceGroup title="최종 조치" value={draft?.action} options={Object.entries(ACTION_LABELS)} onChange={(value) => updateDraft({ action: value as EvaluationAction })} />

            <fieldset className="mt-7"><legend className="text-sm font-bold">분류 위치 <span className="font-normal text-slate-400">(택소노미 목적은 필수)</span></legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><select aria-label="카테고리" value={draft?.category ?? ""} onChange={(event) => updateDraft({ category: event.target.value ? event.target.value as KeywordCategorySlug : null, subgroup: null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">선택 안 함</option>{query.data.taxonomy.map((category) => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select><select aria-label="서브그룹" value={draft?.subgroup ?? ""} disabled={!selectedCategory} onChange={(event) => updateDraft({ subgroup: event.target.value || null })} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"><option value="">선택 안 함</option>{selectedCategory?.subgroups.map((subgroup) => <option key={subgroup} value={subgroup}>{subgroup}</option>)}</select></div></fieldset>
            <label className="mt-7 block text-sm font-bold">메모 <span className="font-normal text-slate-400">(선택)</span><textarea value={draft?.notes ?? ""} maxLength={1000} onChange={(event) => updateDraft({ notes: event.target.value })} rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[var(--color-primary)]" placeholder="경계 사례나 분류 근거를 기록하세요." /></label>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><AdminActionButton tone="dark" disabled={selectedIndex <= 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" />이전</AdminActionButton><AdminActionButton tone="dark" disabled={selectedIndex >= filtered.length - 1} onClick={() => move(1)}>다음<ArrowRight className="h-4 w-4" /></AdminActionButton></div><AdminActionButton tone="primary" disabled={mutation.loading || (draft?.purpose === "taxonomy" && (!draft.category || !draft.subgroup))} onClick={save}>{mutation.loading ? "저장 중…" : "저장하고 다음"}</AdminActionButton></div>
          </AdminSurface>

          <aside className="space-y-4">
            <AdminSurface tone="white" className="rounded-3xl p-5"><h3 className="font-bold">현재 추천 근거</h3><dl className="mt-4 space-y-3 text-sm"><Info label="문자열 분류" value={selected.lexicalCategory ? `${selected.lexicalCategory} / ${selected.lexicalSubgroup}` : "매칭 없음"} /><Info label="기본 관련성" value={selected.passesBasicRelevance ? "통과" : "미통과"} /><Info label="제품·브랜드 신호" value={selected.productOrBrand ? "있음" : "없음"} /><Info label="지역 신호" value={selected.localOrRegional ? "있음" : "없음"} /></dl></AdminSurface>
            <AdminSurface tone="white" className="rounded-3xl p-5 text-sm text-slate-600"><p><strong className="text-slate-900">현재 위치</strong> {selectedIndex + 1} / {filtered.length}</p><p className="mt-3 text-xs leading-5">자동 라벨은 정답이 아닙니다. 검색량보다 실제 검색 의도와 서울본치과 콘텐츠에 활용할 수 있는지를 우선해 판단하세요.</p></AdminSurface>
          </aside>
        </div>
      )}
    </div>
  );
}

function ChoiceGroup({ title, value, options, onChange }: { title: string; value?: string; options: string[][]; onChange: (value: string) => void }) {
  return <fieldset className="mt-7"><legend className="text-sm font-bold">{title}</legend><div className="mt-3 flex flex-wrap gap-2">{options.map(([option, label]) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${value === option ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : "border-slate-200 text-slate-600"}`}>{label}</button>)}</div></fieldset>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 font-medium text-slate-800">{value}</dd></div>; }
