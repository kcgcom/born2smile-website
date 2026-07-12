"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, FilePenLine, LayoutList, Pause, RotateCcw, Sparkles, X } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { getKeywordCategoryLabel, type KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import type { ContentPlannerItem, PlannerStatus } from "@/lib/content-planner";
import { isBlogCategorySlug } from "@/lib/blog";
import type { BlogBlock, BlogTag } from "@/lib/blog/types";
import { AdminErrorState } from "../AdminErrorState";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { BLOG_EDITOR_PREFILL_KEY } from "../blog/blog-editor-draft";
import type { BlogBriefItem, ContentGapItem, FaqSuggestionItem, PageBriefItem, StrategyOverviewData } from "../insight/shared";
import { CategoryBadge, SearchIntentBadge } from "../insight/shared";

interface PlannerCandidate {
  key: string;
  itemType: "blog" | "page" | "faq";
  title: string;
  slug: KeywordCategorySlug;
  targetPage: string;
  rationale: string;
  effort: string;
  effortMinutes: number;
  valueScore: number | null;
  brief: BlogBriefItem | PageBriefItem | FaqSuggestionItem;
  sourceSnapshot: Record<string, unknown>;
}

type PlannerItemType = PlannerCandidate["itemType"];

const ITEM_TYPE_TABS: Array<{ value: PlannerItemType; label: string; description: string }> = [
  { value: "page", label: "페이지 보강", description: "기존 진료 페이지의 부족한 섹션을 한 번에 보강합니다." },
  { value: "blog", label: "블로그 작성", description: "검색 수요가 확인된 주제의 새 글을 연속해서 작성합니다." },
  { value: "faq", label: "FAQ 보강", description: "자주 묻는 질문을 대상 페이지별로 묶어 반영합니다." },
];

const BOARD_STATUSES: PlannerStatus[] = ["approved", "in_progress", "review", "scheduled", "published"];
const ACTIVE_BOARD_STATUSES: PlannerStatus[] = ["approved", "in_progress", "review", "scheduled"];

const STATUS_LABELS: Record<PlannerItemType, Record<PlannerStatus, string>> = {
  blog: {
    approved: "승인",
    in_progress: "작성 중",
    review: "검수 필요",
    scheduled: "발행 예약",
    published: "발행됨",
    deferred: "보류",
    dismissed: "제외",
  },
  page: {
    approved: "승인",
    in_progress: "수정 중",
    review: "검수 필요",
    scheduled: "반영 예정",
    published: "완료",
    deferred: "보류",
    dismissed: "제외",
  },
  faq: {
    approved: "승인",
    in_progress: "작성 중",
    review: "검수 필요",
    scheduled: "반영 예정",
    published: "완료",
    deferred: "보류",
    dismissed: "제외",
  },
};

function findGap(gaps: ContentGapItem[], slug: KeywordCategorySlug, subGroup: string) {
  return gaps.find((gap) => gap.slug === slug && gap.subGroup === subGroup);
}

function demandLabel(gap?: ContentGapItem) {
  if (!gap) return "수요 확인 필요";
  const volume = gap.monthlyVolume ?? 0;
  return volume > 0 ? `월 ${volume.toLocaleString("ko-KR")}` : "확인 불가";
}

function itemTypeLabel(type: PlannerItemType): string {
  if (type === "blog") return "블로그 작성";
  if (type === "page") return "페이지 보강";
  return "FAQ 보강";
}

function valueLabel(type: PlannerItemType): string {
  if (type === "blog") return "신규 글 가치";
  if (type === "page") return "페이지 가치";
  return "FAQ 가치";
}

function scoreLabel(score: number | null): string {
  return score == null ? "평가 없음" : `${score}점`;
}

function itemMeta(item: ContentPlannerItem): { valueScore: number | null; effort: string } {
  const stored = item.sourceSnapshot.plannerMeta;
  if (stored && typeof stored === "object") {
    const meta = stored as Record<string, unknown>;
    return {
      valueScore: typeof meta.valueScore === "number" ? meta.valueScore : null,
      effort: typeof meta.effort === "string" ? meta.effort : item.itemType === "blog" ? "약 90분" : item.itemType === "faq" ? "약 20분" : "확인 필요",
    };
  }
  if (item.itemType === "page") {
    const opportunity = item.sourceSnapshot.opportunity as Record<string, unknown> | undefined;
    const topics = Array.isArray(item.brief.contributingTopics) ? item.brief.contributingTopics.length : 0;
    const effortMinutes = Math.min(120, 45 + Math.max(0, topics - 1) * 15);
    return { valueScore: typeof opportunity?.pageValueScore === "number" ? opportunity.pageValueScore : null, effort: `약 ${effortMinutes}분` };
  }
  if (item.itemType === "faq") {
    return { valueScore: typeof item.brief.valueScore === "number" ? item.brief.valueScore : null, effort: "약 20분" };
  }
  const evaluation = item.sourceSnapshot.evaluation as { actions?: Array<{ actionType?: string; valueScore?: number | null }> } | undefined;
  const action = evaluation?.actions?.find((candidate) => candidate.actionType === "blog");
  return { valueScore: typeof action?.valueScore === "number" ? action.valueScore : null, effort: "약 90분" };
}

function buildCandidates(data: StrategyOverviewData): PlannerCandidate[] {
  const evaluations = new Map((data.opportunityEvaluations ?? []).map((item) => [item.key, item]));
  const blogs = (data.blogBriefs ?? []).map((brief) => {
    const gap = findGap(data.contentGap, brief.slug, brief.subGroup);
    const evaluation = evaluations.get(`${brief.slug}:${brief.subGroup}`);
    const action = evaluation?.actions?.find((item) => item.actionType === "blog");
    const actionValue = action?.valueScore ?? null;
    return {
      key: `blog:${brief.slug}:${brief.subGroup}`,
      itemType: "blog" as const,
      title: brief.suggestedTitle,
      slug: brief.slug,
      targetPage: brief.targetPage,
      rationale: gap ? `${demandLabel(gap)} · 콘텐츠 공백 ${gap.contentGapScore} · 신규 글 가치 ${scoreLabel(actionValue)}` : "새 콘텐츠 기회",
      effort: "약 90분",
      effortMinutes: 90,
      valueScore: actionValue,
      brief,
      sourceSnapshot: { ...(gap ? { gap } : {}), ...(evaluation ? { evaluation } : {}) },
    };
  });
  const pages = (data.pageBriefs ?? []).map((brief) => {
    const opportunity = (data.pageOpportunities ?? []).find((item) => item.targetPage === brief.targetPage)!;
    const contributingEvaluations = (brief.contributingTopics ?? [])
      .map((topic) => evaluations.get(topic.topicKey))
      .filter((item): item is NonNullable<typeof item> => item != null);
    const topics = brief.contributingTopics ?? [];
    const effortMinutes = Math.min(120, 45 + Math.max(0, topics.length - 1) * 15);
    return {
      key: `page:${brief.targetPage}`,
      itemType: "page" as const,
      title: `${getKeywordCategoryLabel(brief.slug)} 페이지 통합 보강`,
      slug: brief.slug,
      targetPage: brief.targetPage,
      rationale: `페이지 가치 ${scoreLabel(opportunity?.pageValueScore ?? null)} · 근거 주제 ${topics.length}개 · ${(opportunity?.missingSections ?? []).join(" · ")}`,
      effort: `약 ${effortMinutes}분`,
      effortMinutes,
      valueScore: opportunity?.pageValueScore ?? null,
      brief,
      sourceSnapshot: { opportunity, evaluations: contributingEvaluations },
    };
  });
  const faqs = (data.faqSuggestions ?? []).map((brief) => {
    const gap = findGap(data.contentGap, brief.slug, brief.subGroup);
    const evaluation = evaluations.get(`${brief.slug}:${brief.subGroup}`);
    return {
      key: `faq:${brief.slug}:${brief.subGroup}`,
      itemType: "faq" as const,
      title: brief.question,
      slug: brief.slug,
      targetPage: brief.targetPage,
      rationale: `${demandLabel(gap)} · FAQ 가치 ${brief.valueScore}`,
      effort: "약 20분",
      effortMinutes: 20,
      valueScore: brief.valueScore,
      brief,
      sourceSnapshot: { ...(gap ? { gap } : {}), ...(evaluation ? { evaluation } : {}) },
    };
  });
  return [...blogs, ...pages, ...faqs];
}

function makeBlogPrefill(brief: BlogBriefItem) {
  const tags: BlogTag[] = brief.searchIntent === "commercial" ? ["비교가이드"] : brief.searchIntent === "transactional" ? ["증상가이드"] : ["팩트체크"];
  const blocks: BlogBlock[] = [
    { type: "paragraph", text: `${brief.targetKeyword}이 궁금한 환자를 위해 서울본치과 관점에서 핵심 내용을 먼저 정리합니다.` },
    ...brief.outline.flatMap<BlogBlock>((item) => [
      { type: "heading", level: 2, text: item },
      { type: "paragraph", text: `${item}에 대해 환자분들이 궁금해하는 기준과 내원 전에 확인할 내용을 중심으로 설명합니다.` },
    ]),
    { type: "paragraph", text: brief.cta },
  ];
  return { title: brief.suggestedTitle, subtitle: `${brief.targetReader}를 위한 ${brief.subGroup} 핵심 안내`, excerpt: brief.metaDescription, category: brief.contentCategory, tags, blocks };
}

export function ContentPlannerSubTab({
  requestedOpportunityKey,
  initialItemType,
}: {
  requestedOpportunityKey: string | null;
  initialItemType: PlannerItemType;
}) {
  const router = useRouter();
  const [activeItemType, setActiveItemType] = useState<PlannerItemType>(initialItemType);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [expandedBriefKeys, setExpandedBriefKeys] = useState<Set<string>>(() => new Set());
  const { mutate, error: mutationError } = useAdminMutation<ContentPlannerItem>();
  const strategy = useAdminApi<StrategyOverviewData>("/api/admin/naver-datalab/trend-summary?mode=strategy");
  const planner = useAdminApi<ContentPlannerItem[]>("/api/admin/content-planner");

  const candidates = useMemo(() => strategy.data ? buildCandidates(strategy.data) : [], [strategy.data]);
  const itemByKey = useMemo(() => new Map((planner.data ?? []).map((item) => [item.opportunityKey, item])), [planner.data]);
  const requestedPlannerItem = requestedOpportunityKey ? itemByKey.get(requestedOpportunityKey) : undefined;
  const allUnreviewedCandidates = useMemo(
    () => candidates.filter((candidate) => !itemByKey.has(candidate.key)),
    [candidates, itemByKey],
  );
  const unreviewedCandidates = useMemo(() => allUnreviewedCandidates
    .filter((candidate) => candidate.itemType === activeItemType)
    .sort((a, b) => (b.valueScore ?? -1) - (a.valueScore ?? -1) || a.effortMinutes - b.effortMinutes),
  [activeItemType, allUnreviewedCandidates]);
  const boardItems = (planner.data ?? []).filter((item) => item.itemType === activeItemType && ACTIVE_BOARD_STATUSES.includes(item.status));
  const completedItems = (planner.data ?? []).filter((item) => item.itemType === activeItemType && item.status === "published");
  const archivedItems = (planner.data ?? []).filter((item) => item.itemType === activeItemType && (item.status === "deferred" || item.status === "dismissed"));
  const deferredCount = archivedItems.filter((item) => item.status === "deferred").length;
  const dismissedCount = archivedItems.filter((item) => item.status === "dismissed").length;
  const activeWorkCount = boardItems.length;
  const publishedCount = completedItems.length;
  const boardByStatus = ACTIVE_BOARD_STATUSES.reduce((acc, status) => { acc[status] = boardItems.filter((item) => item.status === status); return acc; }, {} as Record<PlannerStatus, ContentPlannerItem[]>);
  const activeTab = ITEM_TYPE_TABS.find((tab) => tab.value === activeItemType)!;

  const typeCounts = useMemo(() => Object.fromEntries(ITEM_TYPE_TABS.map((tab) => {
    const unreviewed = allUnreviewedCandidates.filter((candidate) => candidate.itemType === tab.value).length;
    const active = (planner.data ?? []).filter((item) => item.itemType === tab.value && ACTIVE_BOARD_STATUSES.includes(item.status)).length;
    const completed = (planner.data ?? []).filter((item) => item.itemType === tab.value && item.status === "published").length;
    return [tab.value, { unreviewed, active, completed }];
  })) as Record<PlannerItemType, { unreviewed: number; active: number; completed: number }>, [allUnreviewedCandidates, planner.data]);

  useEffect(() => {
    if (!requestedOpportunityKey || strategy.loading || planner.loading) return;
    const targetId = requestedPlannerItem ? `planner-item-${requestedPlannerItem.id}` : "type-candidates";
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [planner.loading, requestedOpportunityKey, requestedPlannerItem, strategy.loading]);

  const selectItemType = (type: PlannerItemType) => {
    setActiveItemType(type);
    setShowArchive(false);
    setShowCompleted(false);
    setExpandedBriefKeys(new Set());
    router.replace(`/admin/content/planner?type=${type}`, { scroll: false });
  };

  const saveCandidate = async (candidate: PlannerCandidate, status: "approved" | "deferred" | "dismissed") => {
    setSavingKey(candidate.key);
    const result = await mutate("/api/admin/content-planner", "POST", {
      opportunityKey: candidate.key, itemType: candidate.itemType, title: candidate.title,
      category: candidate.slug, targetPage: candidate.targetPage, status,
      priority: status === "approved" ? "now" : "watch", rationale: candidate.rationale,
      brief: candidate.brief,
      sourceSnapshot: { ...candidate.sourceSnapshot, plannerMeta: { valueScore: candidate.valueScore, effort: candidate.effort } },
      dueDate: null,
    });
    if (!result.error) {
      planner.refetch();
      setNotice(status === "approved" ? "작업 보드에 추가했습니다." : status === "deferred" ? "후보를 보류했습니다." : "후보를 제외했습니다.");
      window.setTimeout(() => setNotice(null), 2500);
    }
    setSavingKey(null);
  };

  const updateItem = async (item: ContentPlannerItem, updates: { status?: PlannerStatus; dueDate?: string | null }) => {
    setSavingKey(item.id);
    const result = await mutate(`/api/admin/content-planner/${item.id}`, "PUT", updates);
    if (!result.error) planner.refetch();
    setSavingKey(null);
  };

  const restoreItem = async (item: ContentPlannerItem) => {
    setSavingKey(item.id);
    const result = await mutate(`/api/admin/content-planner/${item.id}`, "PUT", { status: "approved" as PlannerStatus });
    if (!result.error) {
      planner.refetch();
      setNotice("작업 보드로 복원했습니다.");
      window.setTimeout(() => setNotice(null), 2500);
    }
    setSavingKey(null);
  };

  const startDraft = (item: ContentPlannerItem) => {
    if (item.itemType !== "blog" || typeof window === "undefined") return;
    const brief = item.brief as unknown as BlogBriefItem;
    const contentCategory = brief.contentCategory ?? (isBlogCategorySlug(item.category) ? item.category : null);
    if (!contentCategory || !isBlogCategorySlug(contentCategory)) return;
    window.sessionStorage.setItem(BLOG_EDITOR_PREFILL_KEY, JSON.stringify(makeBlogPrefill({ ...brief, contentCategory })));
    void updateItem(item, { status: "in_progress" });
    router.push(`/admin/content/posts/new?category=${contentCategory}&prefill=brief`);
  };

  if (strategy.loading || planner.loading) return <AdminLoadingSkeleton variant="full" />;
  if (strategy.error) return <AdminErrorState message={strategy.error} />;
  if (planner.error) return <AdminErrorState message={planner.error} />;

  return (
    <div className="space-y-8">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><AdminPill tone="white">콘텐츠 플래너</AdminPill><AdminPill tone={unreviewedCandidates.length ? "warning" : "white"}>{unreviewedCandidates.length ? `${activeTab.label} 미검토 ${unreviewedCandidates.length}개` : `${activeTab.label} 검토 완료`}</AdminPill></div>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">같은 성격의 콘텐츠 작업을 모아서 처리합니다.</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">작업 유형을 선택한 뒤 후보 검토부터 완료까지 한 흐름으로 관리하세요. 검색 수요와 콘텐츠 근거는 기회 분석 탭에서 확인할 수 있습니다.</p>
          </div>
          <div className="lg:min-w-[360px]">
            <MetricGroup
              label="작업 현황"
              metrics={[
                { label: "미검토 후보", value: unreviewedCandidates.length },
                { label: "진행 작업", value: activeWorkCount },
                { label: "보류", value: deferredCount },
              ]}
            />
          </div>
        </div>
      </AdminSurface>
      {notice && <AdminNotice tone="success">{notice}</AdminNotice>}
      {mutationError && <AdminNotice tone="error">{mutationError}</AdminNotice>}

      <nav aria-label="콘텐츠 작업 유형" className="grid gap-2 md:grid-cols-3">
        {ITEM_TYPE_TABS.map((tab) => {
          const isActive = activeItemType === tab.value;
          const counts = typeCounts[tab.value];
          return (
            <button key={tab.value} type="button" aria-current={isActive ? "page" : undefined} onClick={() => selectItemType(tab.value)} className={`rounded-2xl border px-4 py-4 text-left transition-colors ${isActive ? "border-[var(--color-primary)] bg-[var(--surface)] ring-1 ring-[var(--color-primary)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background)]"}`}>
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-[var(--foreground)]">{tab.label}</span><span className="text-xs font-semibold text-[var(--color-primary)]">미검토 {counts.unreviewed}</span></span>
              <span className="mt-1 block text-xs text-[var(--muted)]">진행 {counts.active}개 · 완료 {counts.completed}개</span>
            </button>
          );
        })}
      </nav>

      <section id="type-candidates" className="scroll-mt-6 space-y-4">
        <div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--color-primary)]" /><h2 className="text-lg font-bold text-[var(--foreground)]">{activeTab.label} 후보</h2><AdminPill tone="white">{unreviewedCandidates.length}개</AdminPill></div><p className="mt-1 text-sm text-[var(--muted)]">{activeTab.description} 가치 점수를 참고해 승인, 보류, 제외 중 하나를 선택하세요.</p></div>
        {unreviewedCandidates.length ? <div className="grid gap-4 xl:grid-cols-2">{unreviewedCandidates.map((candidate, index) => (
          <AdminSurface key={candidate.key} tone="white" className={`rounded-3xl p-5 ${candidate.key === requestedOpportunityKey ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""}`}>
            <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">{index + 1}</span><CategoryBadge category={candidate.slug} /></div>{"searchIntent" in candidate.brief && candidate.brief.searchIntent && <SearchIntentBadge intent={candidate.brief.searchIntent as "informational" | "commercial" | "transactional" | "navigational"} />}</div>
            <h3 className="mt-4 text-base font-bold text-[var(--foreground)]">{candidate.title}</h3><p className="mt-2 text-sm text-[var(--muted)]">{candidate.rationale}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><Fact label="추천 액션" value={itemTypeLabel(candidate.itemType)} /><Fact label={valueLabel(candidate.itemType)} value={scoreLabel(candidate.valueScore)} /><Fact label="예상 작업량" value={candidate.effort} /></div>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><AdminActionButton disabled={savingKey === candidate.key} tone="dark" onClick={() => saveCandidate(candidate, "dismissed")}><X className="h-4 w-4" />제외</AdminActionButton><AdminActionButton disabled={savingKey === candidate.key} tone="dark" onClick={() => saveCandidate(candidate, "deferred")}><Pause className="h-4 w-4" />보류</AdminActionButton><AdminActionButton disabled={savingKey === candidate.key} tone="primary" onClick={() => saveCandidate(candidate, "approved")}><Check className="h-4 w-4" />작업으로 승인</AdminActionButton></div>
          </AdminSurface>
        ))}</div> : <Empty icon={Check} title={`${activeTab.label} 후보를 모두 검토했습니다.`} description="새 검색 데이터가 들어오면 새로운 후보가 나타납니다." />}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><LayoutList className="h-5 w-5 text-[var(--color-primary)]" /><h2 className="text-lg font-bold text-[var(--foreground)]">진행 작업</h2><AdminPill tone="white">{boardItems.length}개</AdminPill></div>

        {(boardItems.length > 0 || completedItems.length > 0) && (
          <ProgressBar total={boardItems.length + completedItems.length} published={publishedCount} active={activeWorkCount} completedLabel={STATUS_LABELS[activeItemType].published} />
        )}

        {boardItems.length ? (
          <div className="space-y-6">
            {ACTIVE_BOARD_STATUSES.map((status) => {
              const items = boardByStatus[status];
              if (!items || items.length === 0) return null;
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-primary)]">{STATUS_LABELS[activeItemType][status]}</span>
                    <span className="text-xs text-[var(--muted)]">{items.length}개</span>
                  </div>
                  <div className="space-y-3">{items.map((item) => (
                    <AdminSurface id={`planner-item-${item.id}`} key={item.id} tone="white" className={`scroll-mt-6 rounded-2xl p-5 ${item.opportunityKey === requestedOpportunityKey ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""}`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminPill tone="white">{itemTypeLabel(item.itemType)}</AdminPill>
                          <span className="text-xs text-[var(--muted)]">{getKeywordCategoryLabel(item.category as KeywordCategorySlug)}</span>
                          {item.dueDate && <span className="text-xs text-[var(--muted)]">~{item.dueDate}</span>}
                        </div>
                        <h3 className="mt-2 truncate text-sm font-bold text-[var(--foreground)]">{item.title}</h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">{item.rationale}</p>
                        {(() => { const meta = itemMeta(item); return <div className="mt-2 flex flex-wrap gap-2 text-[10px]"><span className="rounded-full bg-[var(--background)] px-2 py-1 font-semibold text-[var(--foreground)]">{valueLabel(item.itemType)} {meta.valueScore != null ? `${meta.valueScore}점` : "평가 없음"}</span><span className="rounded-full bg-[var(--background)] px-2 py-1 text-[var(--muted)]">예상 작업량 {meta.effort}</span></div>; })()}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select aria-label={`${item.title} 상태`} value={item.status} disabled={savingKey === item.id} onChange={(event) => updateItem(item, { status: event.target.value as PlannerStatus })} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">{BOARD_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[item.itemType][s]}</option>)}<option value="deferred">보류</option><option value="dismissed">제외</option></select>
                        <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs text-[var(--muted)]"><CalendarDays className="h-4 w-4" /><input type="date" value={item.dueDate ?? ""} disabled={savingKey === item.id} onChange={(event) => updateItem(item, { dueDate: event.target.value || null })} className="bg-transparent text-[var(--foreground)] outline-none" /></label>
                        {item.itemType === "blog" ? <AdminActionButton tone="primary" onClick={() => startDraft(item)}><FilePenLine className="h-4 w-4" />초안 작성<ChevronRight className="h-4 w-4" /></AdminActionButton> : <><AdminActionButton tone="dark" onClick={() => setExpandedBriefKeys((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>작업 지침<ChevronDown className={`h-4 w-4 transition-transform ${expandedBriefKeys.has(item.id) ? "rotate-180" : ""}`} /></AdminActionButton><a href={item.targetPage} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)]">대상 페이지<ChevronRight className="h-4 w-4" /></a></>}
                      </div>
                    </div>{expandedBriefKeys.has(item.id) && item.itemType !== "blog" && <WorkInstructions item={item} />}</AdminSurface>
                  ))}</div>
                </div>
              );
            })}
          </div>
        ) : <Empty icon={Clock3} title="진행 중인 작업이 없습니다." description="추천 후보를 승인하면 작업 보드에 나타납니다." />}
      </section>

      {completedItems.length > 0 && (
        <section className="space-y-3">
          <button type="button" onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            <Check className="h-4 w-4" />
            <span>{STATUS_LABELS[activeItemType].published} 작업</span>
            <AdminPill tone="white">{completedItems.length}개</AdminPill>
            <ChevronDown className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-180" : ""}`} />
          </button>
          {showCompleted && <div className="space-y-2">{completedItems.map((item) => {
            const meta = itemMeta(item);
            return <AdminSurface id={`planner-item-${item.id}`} key={item.id} tone="white" className="rounded-2xl p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-emerald-600">{STATUS_LABELS[item.itemType].published}</span><span className="text-xs text-[var(--muted)]">{getKeywordCategoryLabel(item.category as KeywordCategorySlug)}</span><span className="text-xs text-[var(--muted)]">{valueLabel(item.itemType)} {meta.valueScore != null ? `${meta.valueScore}점` : "평가 없음"}</span></div><h3 className="mt-1 truncate text-sm font-medium text-[var(--foreground)]">{item.title}</h3></div><select aria-label={`${item.title} 상태`} value={item.status} disabled={savingKey === item.id} onChange={(event) => updateItem(item, { status: event.target.value as PlannerStatus })} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">{BOARD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[item.itemType][status]}</option>)}<option value="deferred">보류</option><option value="dismissed">제외</option></select></div></AdminSurface>;
          })}</div>}
        </section>
      )}

      {archivedItems.length > 0 && (
        <section className="space-y-4">
          <button onClick={() => setShowArchive(!showArchive)} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <Archive className="h-4 w-4" />
            <span>보류/제외 항목</span>
            <AdminPill tone="white">{deferredCount + dismissedCount}개</AdminPill>
            <ChevronDown className={`h-4 w-4 transition-transform ${showArchive ? "rotate-180" : ""}`} />
          </button>
          {showArchive && (
            <div className="space-y-2">
              {archivedItems.map((item) => (
                <AdminSurface key={item.id} tone="white" className="rounded-2xl p-4 opacity-70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <AdminPill tone="white">{itemTypeLabel(item.itemType)}</AdminPill>
                        <span className="text-xs text-[var(--muted)]">{getKeywordCategoryLabel(item.category as KeywordCategorySlug)}</span>
                        <span className={`text-xs font-semibold ${item.status === "deferred" ? "text-amber-500" : "text-[var(--muted)]"}`}>{STATUS_LABELS[item.itemType][item.status]}</span>
                      </div>
                      <h3 className="mt-1 truncate text-sm text-[var(--foreground)]">{item.title}</h3>
                    </div>
                    <AdminActionButton tone="dark" disabled={savingKey === item.id} onClick={() => restoreItem(item)}>
                      <RotateCcw className="h-4 w-4" />복원
                    </AdminActionButton>
                  </div>
                </AdminSurface>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function WorkInstructions({ item }: { item: ContentPlannerItem }) {
  if (item.itemType === "page") {
    const brief = item.brief as unknown as PageBriefItem;
    const blocks = Array.isArray(brief.blocks) ? brief.blocks : [];
    const checklist = Array.isArray(brief.checklist) ? brief.checklist : [];
    const faqQuestions = Array.isArray(brief.faqQuestions) ? brief.faqQuestions : [];
    return (
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <h4 className="text-xs font-bold text-[var(--foreground)]">페이지 보강 지침</h4>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <InstructionList title="추가·수정할 블록" items={blocks} empty="권장 블록이 없습니다." />
          <InstructionList title="완료 체크리스트" items={checklist} empty="체크리스트가 없습니다." ordered />
        </div>
        {(brief.heroCopy || brief.supportingCopy) && (
          <div className="mt-4 rounded-xl bg-[var(--background)] p-3">
            <p className="text-[10px] font-semibold text-[var(--muted)]">권장 문구</p>
            {brief.heroCopy && <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{brief.heroCopy}</p>}
            {brief.supportingCopy && <p className="mt-1 text-xs text-[var(--muted)]">{brief.supportingCopy}</p>}
          </div>
        )}
        {faqQuestions.length > 0 && <div className="mt-4"><InstructionList title="함께 검토할 FAQ" items={faqQuestions} empty="" /></div>}
      </div>
    );
  }

  const brief = item.brief as unknown as FaqSuggestionItem;
  const keywords = Array.isArray(brief.keywords) ? brief.keywords : [];
  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <h4 className="text-xs font-bold text-[var(--foreground)]">FAQ 보강 지침</h4>
      <div className="mt-3 rounded-xl bg-[var(--background)] p-3">
        <p className="text-[10px] font-semibold text-[var(--muted)]">추가할 질문</p>
        <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{brief.question ?? item.title}</p>
      </div>
      {keywords.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-[var(--muted)]">답변에 반영할 검색 표현</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{keywords.map((keyword) => <span key={keyword} className="rounded-full bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)]">{keyword}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function InstructionList({ title, items, empty, ordered = false }: { title: string; items: string[]; empty: string; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <p className="text-[10px] font-semibold text-[var(--muted)]">{title}</p>
      {items.length > 0 ? (
        <List className={`mt-1.5 space-y-1 text-xs text-[var(--foreground)] ${ordered ? "list-decimal" : "list-disc"} pl-4`}>
          {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </List>
      ) : <p className="mt-1.5 text-xs text-[var(--muted)]">{empty}</p>}
    </div>
  );
}

function ProgressBar({ total, published, active, completedLabel }: { total: number; published: number; active: number; completedLabel: string }) {
  const publishedPct = total > 0 ? Math.round((published / total) * 100) : 0;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div className="rounded-xl bg-[var(--background)] p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>진행률</span>
        <span>{published}/{total} 완료 ({publishedPct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="flex h-full">
          <div className="bg-emerald-500 transition-all" style={{ width: `${publishedPct}%` }} />
          <div className="bg-[var(--color-primary)] transition-all" style={{ width: `${activePct}%` }} />
        </div>
      </div>
      <div className="mt-1.5 flex gap-4 text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{completedLabel}</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />진행 중</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</div></div>; }
function MetricGroup({ label, metrics }: { label: string; metrics: Array<{ label: string; value: number }> }) { return <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><div className="grid grid-cols-3 gap-2">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</div></div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--background)] px-3 py-2"><div className="text-[10px] text-[var(--muted)]">{label}</div><div className="mt-1 text-xs font-semibold text-[var(--foreground)]">{value}</div></div>; }
function Empty({ icon: Icon, title, description }: { icon: typeof Check; title: string; description: string }) { return <AdminSurface tone="white" className="rounded-3xl p-8 text-center"><Icon className="mx-auto h-8 w-8 text-[var(--muted)]" /><p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</p><p className="mt-1 text-xs text-[var(--muted)]">{description}</p></AdminSurface>; }
