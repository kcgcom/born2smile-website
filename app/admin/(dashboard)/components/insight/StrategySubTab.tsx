"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Check, ChevronDown, ExternalLink, ListFilter, Plus, Search } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { getKeywordCategoryLabel, type KeywordCategorySlug, type SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import type { ContentPlannerItem, PlannerStatus } from "@/lib/content-planner";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { CategoryBadge, SearchIntentBadge, calcTotalVolume } from "./shared";
import type { BlogBriefItem, ContentGapItem, PageBriefItem, PageUpdateOpportunityItem, StrategyOverviewData } from "./shared";
import { EvidenceDataSection } from "./strategy-evidence";
import { OpportunityScatter, type ScatterPoint } from "./strategy-shared";
import { StrategyRulesPanel } from "./strategy-panels";

type CoverageState = "missing" | "thin" | "improve" | "page" | "covered";
type PlannerFilter = "all" | "unplanned" | PlannerStatus;

interface OpportunityRow {
  gap: ContentGapItem;
  coverage: CoverageState;
  direction: "blog" | "page";
  opportunityKey: string;
  plannerItem: ContentPlannerItem | null;
  brief: BlogBriefItem | PageBriefItem | null;
  pageOpportunity: PageUpdateOpportunityItem | null;
}

const COVERAGE_LABELS: Record<CoverageState, string> = {
  missing: "콘텐츠 없음",
  thin: "콘텐츠 부족",
  improve: "기존 글 개선",
  page: "페이지 보강",
  covered: "충분히 다룸",
};

const STATUS_LABELS: Record<PlannerStatus, string> = {
  approved: "플래너 추가됨",
  in_progress: "진행 중",
  review: "검수 필요",
  scheduled: "발행 예약",
  published: "완료",
  deferred: "보류",
  dismissed: "제외",
};

function getCoverageState(gap: ContentGapItem, pageOpportunity?: PageUpdateOpportunityItem): CoverageState {
  if (gap.existingPostCount === 0) return "missing";
  if (pageOpportunity && pageOpportunity.pageUpdateScore >= 72) return "page";
  if (gap.existingPostCount === 1 && gap.gapScore >= 60) return "thin";
  if (gap.existingPostCount >= 2 && gap.gapScore >= 55) return "improve";
  return "covered";
}

function buildRows(data: StrategyOverviewData, items: ContentPlannerItem[]): OpportunityRow[] {
  const plannerByKey = new Map(items.map((item) => [item.opportunityKey, item]));
  const blogBriefByKey = new Map(data.blogBriefs.map((brief) => [`${brief.slug}:${brief.subGroup}`, brief]));
  const pageBriefByKey = new Map(data.pageBriefs.map((brief) => [`${brief.slug}:${brief.subGroup}`, brief]));
  const pageByKey = new Map(data.pageOpportunities.map((item) => [`${item.slug}:${item.subGroup}`, item]));

  return data.contentGap.map((gap) => {
    const key = `${gap.slug}:${gap.subGroup}`;
    const pageOpportunity = pageByKey.get(key) ?? null;
    const coverage = getCoverageState(gap, pageOpportunity ?? undefined);
    const usePage = coverage === "page" && pageBriefByKey.has(key);
    const direction = usePage ? "page" as const : "blog" as const;
    const opportunityKey = `${direction}:${key}`;
    const alternateKey = `${direction === "blog" ? "page" : "blog"}:${key}`;
    return {
      gap,
      coverage,
      direction,
      opportunityKey,
      plannerItem: plannerByKey.get(opportunityKey) ?? plannerByKey.get(alternateKey) ?? null,
      brief: direction === "page" ? pageBriefByKey.get(key) ?? null : blogBriefByKey.get(key) ?? null,
      pageOpportunity,
    };
  });
}

export function StrategySubTab() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") === "analysis" ? "analysis" : "opportunities";
  const [category, setCategory] = useState<KeywordCategorySlug | "all">("all");
  const [intent, setIntent] = useState<SearchIntent | "all">("all");
  const [coverage, setCoverage] = useState<CoverageState | "all">("all");
  const [plannerFilter, setPlannerFilter] = useState<PlannerFilter>("all");
  const [query, setQuery] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { mutate, error: mutationError } = useAdminMutation<ContentPlannerItem>();
  const strategy = useAdminApi<StrategyOverviewData>("/api/admin/naver-datalab/trend-summary?mode=strategy");
  const planner = useAdminApi<ContentPlannerItem[]>("/api/admin/content-planner");

  const rows = useMemo(
    () => strategy.data ? buildRows(strategy.data, planner.data ?? []) : [],
    [planner.data, strategy.data],
  );
  const filteredRows = useMemo(() => rows.filter((row) => {
    if (category !== "all" && row.gap.slug !== category) return false;
    if (intent !== "all" && row.gap.searchIntent !== intent) return false;
    if (coverage !== "all" && row.coverage !== coverage) return false;
    if (plannerFilter === "unplanned" && row.plannerItem) return false;
    if (plannerFilter !== "all" && plannerFilter !== "unplanned" && row.plannerItem?.status !== plannerFilter) return false;
    if (query.trim()) {
      const haystack = `${row.gap.subGroup} ${row.gap.keywords.join(" ")}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  }), [category, coverage, intent, plannerFilter, query, rows]);
  const scatterData = useMemo<ScatterPoint[]>(() => rows
    .map(({ gap }) => ({ ...gap, totalVolume: calcTotalVolume(gap) }))
    .filter((gap) => gap.monthlyVolume != null && gap.totalVolume > 0)
    .map((gap) => ({
      subGroup: gap.subGroup,
      category: gap.category,
      slug: gap.slug,
      x: gap.totalVolume,
      y: gap.existingPostCount,
      z: gap.gapScore,
      searchIntent: gap.searchIntent,
    })), [rows]);

  const addToPlanner = async (row: OpportunityRow) => {
    if (!row.brief) return;
    setSavingKey(row.opportunityKey);
    const isPage = row.direction === "page";
    const title = isPage
      ? `${getKeywordCategoryLabel(row.gap.slug)} ${row.gap.subGroup} 페이지 보강`
      : (row.brief as BlogBriefItem).suggestedTitle;
    const targetPage = row.brief.targetPage;
    const volume = calcTotalVolume(row.gap);
    const rationale = `${volume > 0 ? `월 검색량 ${volume.toLocaleString("ko-KR")}` : `상대지수 ${row.gap.currentAvg.toFixed(1)}`} · 관련 포스트 ${row.gap.existingPostCount}개 · ${COVERAGE_LABELS[row.coverage]}`;
    const result = await mutate("/api/admin/content-planner", "POST", {
      opportunityKey: row.opportunityKey,
      itemType: row.direction,
      title,
      category: row.gap.slug,
      targetPage,
      status: "approved",
      priority: row.gap.gapScore >= 70 ? "now" : "next",
      rationale,
      brief: row.brief,
      sourceSnapshot: { gap: row.gap, ...(row.pageOpportunity ? { opportunity: row.pageOpportunity } : {}) },
      dueDate: null,
    });
    if (!result.error) {
      planner.refetch();
      setNotice("콘텐츠 플래너에 작업을 추가했습니다.");
      window.setTimeout(() => setNotice(null), 2500);
    }
    setSavingKey(null);
  };

  if (strategy.loading || planner.loading) return <AdminLoadingSkeleton variant="full" />;
  if (strategy.error) return <AdminErrorState message={strategy.error} />;
  if (planner.error) return <AdminErrorState message={planner.error} />;
  if (!strategy.data) {
    return <AdminErrorState message="네이버 DataLab API 설정이 없어 기회 분석 데이터를 만들 수 없습니다." />;
  }

  const missingCount = rows.filter((row) => row.coverage === "missing").length;
  const improvementCount = rows.filter((row) => ["thin", "improve", "page"].includes(row.coverage)).length;
  const plannedCount = rows.filter((row) => row.plannerItem).length;

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverDatalab", "naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><AdminPill tone="white">기회 분석</AdminPill><AdminPill tone={missingCount > 0 ? "warning" : "white"}>{missingCount > 0 ? `콘텐츠 없음 ${missingCount}개` : "주요 주제 커버됨"}</AdminPill></div>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">검색 수요와 현재 콘텐츠의 차이를 찾습니다.</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">이 화면에서는 추천 근거를 검토합니다. 실행하기로 결정한 항목은 콘텐츠 플래너에 추가해 상태와 일정을 관리하세요.</p>
            <div className="mt-4 flex flex-wrap gap-2"><AdminActionLink tone="primary" href="/admin/content/planner">콘텐츠 플래너 열기</AdminActionLink></div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[480px]">
            <Metric label="분석 주제" value={rows.length} />
            <Metric label="콘텐츠 없음" value={missingCount} />
            <Metric label="개선 필요" value={improvementCount} />
            <Metric label="플래너 반영" value={plannedCount} />
          </div>
        </div>
      </AdminSurface>

      {notice && <AdminNotice tone="success">{notice}</AdminNotice>}
      {mutationError && <AdminNotice tone="error">{mutationError}</AdminNotice>}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <ViewLink href={pathname} active={activeView === "opportunities"}>기회 목록</ViewLink>
        <ViewLink href={`${pathname}?view=analysis`} active={activeView === "analysis"}><BarChart3 className="h-4 w-4" />전체 분석</ViewLink>
      </div>

      {activeView === "opportunities" && <>
      <AdminSurface tone="white" className="rounded-3xl p-5">
        <div className="flex items-center gap-2"><ListFilter className="h-4 w-4 text-[var(--color-primary)]" /><h2 className="text-sm font-bold text-[var(--foreground)]">기회 필터</h2></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주제·키워드 검색" className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]" /></label>
          <FilterSelect label="진료 영역" value={category} onChange={(value) => setCategory(value as KeywordCategorySlug | "all")} options={[{ value: "all", label: "전체 영역" }, ...Array.from(new Set(rows.map((row) => row.gap.slug))).map((slug) => ({ value: slug, label: getKeywordCategoryLabel(slug) }))]} />
          <FilterSelect label="콘텐츠 상태" value={coverage} onChange={(value) => setCoverage(value as CoverageState | "all")} options={[{ value: "all", label: "전체 상태" }, ...Object.entries(COVERAGE_LABELS).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label="검색 의도" value={intent} onChange={(value) => setIntent(value as SearchIntent | "all")} options={[{ value: "all", label: "전체 의도" }, { value: "informational", label: "정보형" }, { value: "commercial", label: "비교·검토" }, { value: "transactional", label: "전환형" }, { value: "navigational", label: "탐색형" }]} />
          <FilterSelect label="플래너 상태" value={plannerFilter} onChange={(value) => setPlannerFilter(value as PlannerFilter)} options={[{ value: "all", label: "전체 작업" }, { value: "unplanned", label: "미결정" }, { value: "approved", label: "추가됨" }, { value: "in_progress", label: "진행 중" }, { value: "deferred", label: "보류" }, { value: "dismissed", label: "제외" }, { value: "published", label: "완료" }]} />
        </div>
      </AdminSurface>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[var(--foreground)]">콘텐츠 기회</h2><p className="mt-1 text-sm text-[var(--muted)]">같은 주제는 한 번만 표시하며, 상세 근거는 행을 펼쳐 확인합니다.</p></div><AdminPill tone="white">{filteredRows.length}개</AdminPill></div>
        {filteredRows.length > 0 ? filteredRows.map((row) => (
          <OpportunityCard key={`${row.gap.slug}:${row.gap.subGroup}`} row={row} saving={savingKey === row.opportunityKey} onAdd={() => addToPlanner(row)} />
        )) : <AdminSurface tone="white" className="rounded-3xl p-8 text-center"><p className="text-sm text-[var(--muted)]">조건에 맞는 콘텐츠 기회가 없습니다.</p></AdminSurface>}
      </section>
      </>}

      {activeView === "analysis" && (
        <div className="space-y-8">
          {scatterData.length > 0 && (
            <AdminSurface tone="white" className="rounded-3xl p-6">
              <h2 className="text-lg font-bold text-[var(--foreground)]">기회 매트릭스</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">검색량이 높고 기존 콘텐츠가 적은 주제를 우선적으로 확인합니다.</p>
              <div className="mt-5"><OpportunityScatter data={scatterData} /></div>
            </AdminSurface>
          )}
          <EvidenceDataSection
            contentGap={strategy.data.contentGap}
            insightActions={strategy.data.insightActions}
            pageOpportunities={strategy.data.pageOpportunities}
          />
          <StrategyRulesPanel />
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ row, saving, onAdd }: { row: OpportunityRow; saving: boolean; onAdd: () => void }) {
  const volume = calcTotalVolume(row.gap);
  return (
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><CategoryBadge category={row.gap.slug} /><SearchIntentBadge intent={row.gap.searchIntent ?? "informational"} /><CoverageBadge coverage={row.coverage} /></div>
          <h3 className="mt-3 text-base font-bold text-[var(--foreground)]">{row.gap.subGroup}</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">{volume > 0 ? `월 검색량 ${volume.toLocaleString("ko-KR")}` : `상대지수 ${row.gap.currentAvg.toFixed(1)}`} · 기존 포스트 {row.gap.existingPostCount}개 · 갭 {row.gap.gapScore} · 추천 방향 {row.direction === "page" ? "서비스 페이지 보강" : row.coverage === "improve" ? "기존 글 개선" : "새 글 작성"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.plannerItem ? <AdminPill tone={row.plannerItem.status === "deferred" || row.plannerItem.status === "dismissed" ? "warning" : "white"}><Check className="mr-1 h-3 w-3" />{STATUS_LABELS[row.plannerItem.status]}</AdminPill> : <AdminActionButton tone="primary" disabled={!row.brief || saving} onClick={onAdd}><Plus className="h-4 w-4" />{row.brief ? "플래너에 추가" : "브리프 없음"}</AdminActionButton>}
          {row.plannerItem && <AdminActionLink tone="dark" href="/admin/content/planner">플래너 열기</AdminActionLink>}
        </div>
      </div>
      <details className="group mt-4 border-t border-[var(--border)] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-[var(--color-primary)]">판단 근거 보기<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
        <div className="mt-4 grid gap-4 text-xs md:grid-cols-3">
          <EvidenceBlock title="검색 신호" lines={[`변화율 ${row.gap.changeRate > 0 ? "+" : ""}${row.gap.changeRate.toFixed(1)}%`, `추이 ${row.gap.trend === "rising" ? "상승" : row.gap.trend === "falling" ? "하락" : "보합"}`, `데이터 신뢰 ${row.gap.monthlyVolume != null ? "높음" : row.gap.currentAvg > 0 ? "보통" : "낮음"}`]} />
          <EvidenceBlock title="대표 키워드" lines={((row.gap.directKeywords ?? []).length ? row.gap.directKeywords ?? [] : row.gap.relatedKeywords ?? []).slice(0, 4).map((item) => `${item.keyword} · ${item.volume.toLocaleString("ko-KR")}/월`)} />
          <EvidenceBlock title="페이지 근거" lines={row.pageOpportunity ? [`보강 점수 ${row.pageOpportunity.pageUpdateScore}`, ...row.pageOpportunity.missingSections] : ["별도 페이지 보강 신호 없음"]} />
        </div>
        <a href={row.direction === "page" && row.brief ? row.brief.targetPage : `/blog/${row.gap.slug}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline">대상 영역 열기<ExternalLink className="h-3.5 w-3.5" /></a>
      </details>
    </AdminSurface>
  );
}

function CoverageBadge({ coverage }: { coverage: CoverageState }) {
  const className = coverage === "missing" ? "bg-red-50 text-red-700" : coverage === "covered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{COVERAGE_LABELS[coverage]}</span>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="text-xs text-[var(--muted)]"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</div></div>; }
function EvidenceBlock({ title, lines }: { title: string; lines: string[] }) { return <div className="rounded-xl bg-[var(--background)] p-3"><h4 className="font-semibold text-[var(--foreground)]">{title}</h4><ul className="mt-2 space-y-1 text-[var(--muted)]">{lines.length ? lines.map((line) => <li key={line}>• {line}</li>) : <li>• 확인 가능한 데이터 없음</li>}</ul></div>; }
function ViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <AdminActionLink tone={active ? "primary" : "dark"} href={href} aria-current={active ? "page" : undefined}>{children}</AdminActionLink>; }
