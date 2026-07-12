"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronRight, Clock3, FilePenLine, LayoutList, Pause, Sparkles, X } from "lucide-react";
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
  demandLabel: string;
  confidence: "B" | "C";
  effort: string;
  effortMinutes: number;
  valueScore: number;
  brief: BlogBriefItem | PageBriefItem | FaqSuggestionItem;
  sourceSnapshot: Record<string, unknown>;
}

const STATUS_LABELS: Record<PlannerStatus, string> = {
  approved: "승인",
  in_progress: "작성 중",
  review: "검수 필요",
  scheduled: "발행 예약",
  published: "발행됨",
  deferred: "보류",
  dismissed: "제외",
};
const BOARD_STATUSES: PlannerStatus[] = ["approved", "in_progress", "review", "scheduled", "published"];

function findGap(gaps: ContentGapItem[], slug: KeywordCategorySlug, subGroup: string) {
  return gaps.find((gap) => gap.slug === slug && gap.subGroup === subGroup);
}

function demandLabel(gap?: ContentGapItem) {
  if (!gap) return "수요 확인 필요";
  const volume = gap.monthlyVolume ?? 0;
  return volume > 0 ? `월 ${volume.toLocaleString("ko-KR")}` : "확인 불가";
}

function itemTypeLabel(type: PlannerCandidate["itemType"]): string {
  if (type === "blog") return "새 글";
  if (type === "page") return "페이지 보강";
  return "FAQ 보강";
}

function buildCandidates(data: StrategyOverviewData): PlannerCandidate[] {
  const evaluations = new Map((data.opportunityEvaluations ?? []).map((item) => [item.key, item]));
  const blogs = (data.blogBriefs ?? []).map((brief) => {
    const gap = findGap(data.contentGap, brief.slug, brief.subGroup);
    const evaluation = evaluations.get(`${brief.slug}:${brief.subGroup}`)!;
    const action = evaluation.actions.find((item) => item.actionType === "blog")!;
    return {
      key: `blog:${brief.slug}:${brief.subGroup}`,
      itemType: "blog" as const,
      title: brief.suggestedTitle,
      slug: brief.slug,
      targetPage: brief.targetPage,
      rationale: gap ? `${demandLabel(gap)} · 콘텐츠 공백 ${gap.contentGapScore} · 신규 글 가치 ${action.valueScore}` : "새 콘텐츠 기회",
      demandLabel: demandLabel(gap),
      confidence: evaluation.confidence,
      effort: "약 90분",
      effortMinutes: 90,
      valueScore: action.valueScore ?? 0,
      brief,
      sourceSnapshot: { ...(gap ? { gap } : {}), evaluation },
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
      rationale: `페이지 가치 ${opportunity?.pageValueScore ?? 0} · 근거 주제 ${topics.length}개 · ${(opportunity?.missingSections ?? []).join(" · ")}`,
      demandLabel: `${topics.length}개 주제 근거`,
      confidence: contributingEvaluations.some((item) => item.confidence === "C") ? "C" as const : "B" as const,
      effort: `약 ${effortMinutes}분`,
      effortMinutes,
      valueScore: opportunity?.pageValueScore ?? 0,
      brief,
      sourceSnapshot: { opportunity, evaluations: contributingEvaluations },
    };
  });
  const faqs = (data.faqSuggestions ?? []).map((brief) => {
    const gap = findGap(data.contentGap, brief.slug, brief.subGroup);
    const evaluation = evaluations.get(`${brief.slug}:${brief.subGroup}`)!;
    return {
      key: `faq:${brief.slug}:${brief.subGroup}`,
      itemType: "faq" as const,
      title: brief.question,
      slug: brief.slug,
      targetPage: brief.targetPage,
      rationale: `${demandLabel(gap)} · FAQ 가치 ${brief.valueScore}`,
      demandLabel: demandLabel(gap),
      confidence: evaluation.confidence,
      effort: "약 20분",
      effortMinutes: 20,
      valueScore: brief.valueScore,
      brief,
      sourceSnapshot: { ...(gap ? { gap } : {}), evaluation },
    };
  });
  return [...blogs, ...pages, ...faqs];
}

function selectBalancedRecommendations(
  candidates: PlannerCandidate[],
  requestedOpportunityKey: string | null,
  limit = 5,
): PlannerCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.valueScore - a.valueScore || a.effortMinutes - b.effortMinutes || a.title.localeCompare(b.title, "ko"));
  const requested = sorted.find((candidate) => candidate.key === requestedOpportunityKey);
  const selected = requested ? [requested] : [];
  const remaining = sorted.filter((candidate) => candidate.key !== requested?.key);
  while (selected.length < limit && remaining.length > 0) {
    const top = remaining[0];
    const sameTypeCount = selected.filter((candidate) => candidate.itemType === top.itemType).length;
    let index = sameTypeCount >= 3
      ? remaining.findIndex((candidate) => candidate.itemType !== top.itemType && top.valueScore - candidate.valueScore <= 10)
      : -1;
    if (index < 0 && remaining[1] && top.valueScore - remaining[1].valueScore <= 10 && remaining[1].effortMinutes < top.effortMinutes) index = 1;
    if (index < 0) index = 0;
    selected.push(remaining.splice(index, 1)[0]);
  }
  return selected;
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
  return { title: brief.suggestedTitle, subtitle: `${brief.targetReader}를 위한 ${brief.subGroup} 핵심 안내`, excerpt: brief.metaDescription, category: brief.slug, tags, blocks };
}

export function ContentPlannerSubTab({ requestedOpportunityKey }: { requestedOpportunityKey: string | null }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { mutate, error: mutationError } = useAdminMutation<ContentPlannerItem>();
  const strategy = useAdminApi<StrategyOverviewData>("/api/admin/naver-datalab/trend-summary?mode=strategy");
  const planner = useAdminApi<ContentPlannerItem[]>("/api/admin/content-planner");

  const candidates = useMemo(() => strategy.data ? buildCandidates(strategy.data) : [], [strategy.data]);
  const itemByKey = useMemo(() => new Map((planner.data ?? []).map((item) => [item.opportunityKey, item])), [planner.data]);
  const requestedPlannerItem = requestedOpportunityKey ? itemByKey.get(requestedOpportunityKey) : undefined;
  const unreviewedCandidates = candidates.filter((candidate) => !itemByKey.has(candidate.key));
  const recommended = useMemo(
    () => selectBalancedRecommendations(unreviewedCandidates, requestedOpportunityKey),
    [requestedOpportunityKey, unreviewedCandidates],
  );
  const boardItems = (planner.data ?? []).filter((item) => BOARD_STATUSES.includes(item.status));
  const deferredCount = (planner.data ?? []).filter((item) => item.status === "deferred").length;
  const blogOpportunityCount = strategy.data?.blogBriefs?.length ?? 0;
  const pageOpportunityCount = strategy.data?.pageOpportunities?.length ?? 0;
  const faqOpportunityCount = strategy.data?.faqSuggestions?.length ?? 0;
  const activeWorkCount = boardItems.filter((item) => item.status !== "published").length;

  useEffect(() => {
    if (!requestedOpportunityKey || strategy.loading || planner.loading) return;
    const targetId = requestedPlannerItem ? `planner-item-${requestedPlannerItem.id}` : "weekly-recommendations";
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [planner.loading, requestedOpportunityKey, requestedPlannerItem, strategy.loading]);

  const saveCandidate = async (candidate: PlannerCandidate, status: "approved" | "deferred" | "dismissed") => {
    setSavingKey(candidate.key);
    const result = await mutate("/api/admin/content-planner", "POST", {
      opportunityKey: candidate.key, itemType: candidate.itemType, title: candidate.title,
      category: candidate.slug, targetPage: candidate.targetPage, status,
      priority: status === "approved" ? "now" : "watch", rationale: candidate.rationale,
      brief: candidate.brief, sourceSnapshot: candidate.sourceSnapshot, dueDate: null,
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

  const startDraft = (item: ContentPlannerItem) => {
    if (item.itemType !== "blog" || !isBlogCategorySlug(item.category) || typeof window === "undefined") return;
    window.sessionStorage.setItem(BLOG_EDITOR_PREFILL_KEY, JSON.stringify(makeBlogPrefill(item.brief as unknown as BlogBriefItem)));
    void updateItem(item, { status: "in_progress" });
    router.push(`/admin/content/posts/new?category=${item.category}&prefill=brief`);
  };

  if (strategy.loading || planner.loading) return <AdminLoadingSkeleton variant="full" />;
  if (strategy.error) return <AdminErrorState message={strategy.error} />;
  if (planner.error) return <AdminErrorState message={planner.error} />;

  return (
    <div className="space-y-8">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><AdminPill tone="white">콘텐츠 플래너</AdminPill><AdminPill tone={unreviewedCandidates.length ? "warning" : "white"}>{unreviewedCandidates.length ? `미검토 후보 ${unreviewedCandidates.length}개` : "새 후보 검토 완료"}</AdminPill></div>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">이번 주에 끝낼 콘텐츠 작업을 정합니다.</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">추천을 승인하면 영구 작업으로 저장됩니다. 기회 분석 탭에서 검색 수요와 콘텐츠 근거를 자세히 확인할 수 있습니다.</p>
          </div>
          <div className="space-y-3 lg:min-w-[520px]">
            <MetricGroup
              label="실행 후보 구성"
              metrics={[
                { label: "새 글", value: blogOpportunityCount },
                { label: "페이지 보강", value: pageOpportunityCount },
                { label: "FAQ 보강", value: faqOpportunityCount },
              ]}
            />
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

      <section id="weekly-recommendations" className="scroll-mt-6 space-y-4">
        <div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[var(--color-primary)]" /><h2 className="text-lg font-bold text-[var(--foreground)]">이번 주 추천</h2></div><p className="mt-1 text-sm text-[var(--muted)]">한 번에 최대 5개만 보여줍니다. 승인, 보류, 제외 중 하나를 선택하세요.</p></div>
        {recommended.length ? <div className="grid gap-4 xl:grid-cols-2">{recommended.map((candidate, index) => (
          <AdminSurface key={candidate.key} tone="white" className={`rounded-3xl p-5 ${candidate.key === requestedOpportunityKey ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""}`}>
            <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">{index + 1}</span><CategoryBadge category={candidate.slug} /><AdminPill tone="white">{itemTypeLabel(candidate.itemType)}</AdminPill></div>{"searchIntent" in candidate.brief && candidate.brief.searchIntent && <SearchIntentBadge intent={candidate.brief.searchIntent as "informational" | "commercial" | "transactional" | "navigational"} />}</div>
            <h3 className="mt-4 text-base font-bold text-[var(--foreground)]">{candidate.title}</h3><p className="mt-2 text-sm text-[var(--muted)]">{candidate.rationale}</p>
            <div className="mt-4 grid grid-cols-3 gap-2"><Fact label="기회 가치" value={`${candidate.valueScore}점`} /><Fact label="신뢰도" value={candidate.confidence} /><Fact label="예상 작업량" value={candidate.effort} /></div>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><AdminActionButton disabled={savingKey === candidate.key} tone="dark" onClick={() => saveCandidate(candidate, "dismissed")}><X className="h-4 w-4" />제외</AdminActionButton><AdminActionButton disabled={savingKey === candidate.key} tone="dark" onClick={() => saveCandidate(candidate, "deferred")}><Pause className="h-4 w-4" />보류</AdminActionButton><AdminActionButton disabled={savingKey === candidate.key} tone="primary" onClick={() => saveCandidate(candidate, "approved")}><Check className="h-4 w-4" />작업으로 승인</AdminActionButton></div>
          </AdminSurface>
        ))}</div> : <Empty icon={Check} title="현재 추천 후보를 모두 검토했습니다." description="새 검색 데이터가 들어오면 새로운 후보가 나타납니다." />}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><LayoutList className="h-5 w-5 text-[var(--color-primary)]" /><h2 className="text-lg font-bold text-[var(--foreground)]">작업 보드</h2><AdminPill tone="white">{boardItems.length}개</AdminPill></div>
        {boardItems.length ? <div className="space-y-3">{boardItems.map((item) => (
          <AdminSurface id={`planner-item-${item.id}`} key={item.id} tone="white" className={`scroll-mt-6 rounded-2xl p-5 ${item.opportunityKey === requestedOpportunityKey ? "ring-2 ring-[var(--color-primary)] ring-offset-2" : ""}`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><AdminPill tone="white">{itemTypeLabel(item.itemType)}</AdminPill><span className="text-xs text-[var(--muted)]">{getKeywordCategoryLabel(item.category as KeywordCategorySlug)}</span><span className="text-xs font-semibold text-[var(--color-primary)]">{STATUS_LABELS[item.status]}</span></div><h3 className="mt-2 truncate text-sm font-bold text-[var(--foreground)]">{item.title}</h3><p className="mt-1 text-xs text-[var(--muted)]">{item.rationale}</p></div>
            <div className="flex flex-wrap items-center gap-2"><select aria-label={`${item.title} 상태`} value={item.status} disabled={savingKey === item.id} onChange={(event) => updateItem(item, { status: event.target.value as PlannerStatus })} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">{BOARD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}<option value="deferred">보류</option><option value="dismissed">제외</option></select>
              <label className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs text-[var(--muted)]"><CalendarDays className="h-4 w-4" /><input type="date" value={item.dueDate ?? ""} disabled={savingKey === item.id} onChange={(event) => updateItem(item, { dueDate: event.target.value || null })} className="bg-transparent text-[var(--foreground)] outline-none" /></label>
              {item.itemType === "blog" ? <AdminActionButton tone="primary" onClick={() => startDraft(item)}><FilePenLine className="h-4 w-4" />초안 작성<ChevronRight className="h-4 w-4" /></AdminActionButton> : <a href={item.targetPage} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 text-sm font-medium text-[var(--surface)]">대상 페이지<ChevronRight className="h-4 w-4" /></a>}
            </div>
          </div></AdminSurface>
        ))}</div> : <Empty icon={Clock3} title="진행 중인 작업이 없습니다." description="추천 후보를 승인하면 작업 보드에 나타납니다." />}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center"><div className="text-xs text-[var(--muted)]">{label}</div><div className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</div></div>; }
function MetricGroup({ label, metrics }: { label: string; metrics: Array<{ label: string; value: number }> }) { return <div><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p><div className="grid grid-cols-3 gap-2">{metrics.map((metric) => <Metric key={metric.label} {...metric} />)}</div></div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[var(--background)] px-3 py-2"><div className="text-[10px] text-[var(--muted)]">{label}</div><div className="mt-1 text-xs font-semibold text-[var(--foreground)]">{value}</div></div>; }
function Empty({ icon: Icon, title, description }: { icon: typeof Check; title: string; description: string }) { return <AdminSurface tone="white" className="rounded-3xl p-8 text-center"><Icon className="mx-auto h-8 w-8 text-[var(--muted)]" /><p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</p><p className="mt-1 text-xs text-[var(--muted)]">{description}</p></AdminSurface>; }
