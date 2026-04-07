"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileQuestion, Lightbulb, NotebookPen, Sparkles, Target, Wrench } from "lucide-react";
import { isBlogCategorySlug } from "@/lib/blog";
import type { KeywordCategorySlug, SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import { useAdminApi } from "../useAdminApi";
import { DataTable } from "../DataTable";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { BusinessValueBadge, CategoryBadge, GapScoreBadge, SearchIntentBadge, calcTotalVolume } from "./shared";
import type { BlogBriefItem, ContentGapItem, FaqSuggestionItem, InsightActionItem, OverviewData, PageBriefItem, PageUpdateOpportunityItem } from "./shared";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { BLOG_EDITOR_PREFILL_KEY, PAGE_BRIEF_WORKNOTE_KEY } from "../blog/blog-editor-draft";
import type { BlogBlock, BlogTag } from "@/lib/blog/types";
import { PageBriefPanel, StrategyRulesPanel } from "./strategy-panels";
import {
  ACTION_LABELS,
  INTENT_FILTER_OPTIONS,
  OpportunityScatter,
  buildCrossKeywords,
  type ScatterPoint,
  useGapTableSort,
} from "./strategy-shared";

export function StrategySubTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [intentFilter, setIntentFilter] = useState<SearchIntent | "all">("all");

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
  } = useAdminApi<OverviewData>("/api/admin/naver-datalab/overview");
  const insightActions = overviewData?.insightActions ?? [];
  const faqSuggestions = overviewData?.faqSuggestions ?? [];
  const pageOpportunities = overviewData?.pageOpportunities ?? [];
  const blogBriefs = overviewData?.blogBriefs ?? [];
  const pageBriefs = overviewData?.pageBriefs ?? [];

  const { sortKey: gapSortKey, sortDirection: gapSortDir, handleSort: handleGapSort, sort: sortGapRows } =
    useGapTableSort("monthlyVolume");

  const handleNewPost = (slug: KeywordCategorySlug) => {
    if (!isBlogCategorySlug(slug)) return;
    router.push(`/admin/content/posts/new?category=${slug}`);
  };

  const startBriefDraft = (brief: BlogBriefItem) => {
    if (!isBlogCategorySlug(brief.slug) || typeof window === "undefined") return;

    const tags: BlogTag[] =
      brief.searchIntent === "commercial"
        ? ["비교가이드"]
        : brief.searchIntent === "transactional"
          ? ["증상가이드"]
          : ["팩트체크"];

    const blocks: BlogBlock[] = [
      { type: "paragraph", text: `${brief.targetKeyword}이 궁금한 환자를 위해 서울본치과 관점에서 핵심 내용을 먼저 정리합니다.` },
      ...brief.outline.flatMap<BlogBlock>((item) => [
        { type: "heading", level: 2, text: item },
        { type: "paragraph", text: `${item}에 대해 실제 상담에서 환자분들이 궁금해하는 기준, 치료 전후 체크포인트, 내원 전에 확인할 내용을 중심으로 구체적으로 설명합니다.` },
      ]),
      { type: "paragraph", text: brief.cta },
    ];

    window.sessionStorage.setItem(
      BLOG_EDITOR_PREFILL_KEY,
      JSON.stringify({
        title: brief.suggestedTitle,
        subtitle: `${brief.targetReader}를 위한 ${brief.subGroup} 핵심 안내`,
        excerpt: brief.metaDescription,
        category: brief.slug,
        tags,
        blocks,
      }),
    );
    router.push(`/admin/content/posts/new?category=${brief.slug}&prefill=brief`);
  };

  const openPageBriefWorkspace = (brief: PageBriefItem) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PAGE_BRIEF_WORKNOTE_KEY, JSON.stringify(brief));
    updatePanel("brief");
  };

  // Pre-compute totalVolume per gap item once
  const gapItemsWithVolume = useMemo(
    () => (overviewData?.contentGap ?? []).map((item) => ({
      ...item,
      totalVolume: calcTotalVolume(item),
      id: `${item.slug}-${item.subGroup}`,
    })),
    [overviewData?.contentGap],
  );

  const maxVolume = useMemo(
    () => Math.max(...gapItemsWithVolume.map((g) => g.totalVolume), 1),
    [gapItemsWithVolume],
  );

  // Scatter data
  const scatterData: ScatterPoint[] = useMemo(
    () => gapItemsWithVolume
      .filter((g) => g.monthlyVolume != null && g.totalVolume > 0)
      .map((g) => ({
        subGroup: g.subGroup,
        category: g.category,
        slug: g.slug,
        x: g.totalVolume,
        y: g.existingPostCount,
        z: g.gapScore,
        searchIntent: g.searchIntent,
      })),
    [gapItemsWithVolume],
  );

  const crossKeywords = useMemo(() => buildCrossKeywords(overviewData?.contentGap ?? []), [overviewData?.contentGap]);
  const activePanel = searchParams.get("panel");
  const selectedPageBrief = useMemo(() => {
    if (activePanel !== "brief" || typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(PAGE_BRIEF_WORKNOTE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PageBriefItem;
    } catch {
      return null;
    }
  }, [activePanel]);

  const updatePanel = (panel?: "rules" | "brief") => {
    const params = new URLSearchParams(searchParams.toString());
    if (panel) params.set("panel", panel);
    else params.delete("panel");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  // ── Graceful degradation ─────────────────────────────────────
  if (!overviewLoading && !overviewError && overviewData === null) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <p className="text-sm text-[var(--muted)]">
          네이버 DataLab API 키가 설정되지 않았습니다. 환경변수{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_ID</code>{" "}
          와{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_SECRET</code>{" "}
          을 설정해주세요.
        </p>
      </div>
    );
  }

  if (overviewLoading) {
    return <AdminLoadingSkeleton variant="full" />;
  }

  if (overviewError) {
    return <AdminErrorState message={overviewError} />;
  }

  if (!overviewData) return null;

  const filteredGap = intentFilter === "all"
    ? overviewData.contentGap
    : overviewData.contentGap.filter((item) => item.searchIntent === intentFilter);

  const gapRows = sortGapRows(filteredGap).map((item) => ({
    ...item,
    id: `${item.slug}-${item.subGroup}`,
  }));

  const urgentGapCount = filteredGap.filter((item) => item.gapScore >= 70).length;
  const topGapItem = gapRows[0] ?? null;
  const topPageOpportunity = pageOpportunities[0] ?? null;
  const topInsightAction = insightActions[0] ?? null;
  const topFaqSuggestion = faqSuggestions[0] ?? null;
  const actionableCount = insightActions.length + pageOpportunities.length + faqSuggestions.length;
  const briefCount = blogBriefs.length + pageBriefs.length;
  const actionByKey = new Map(insightActions.map((item) => [`${item.slug}:${item.subGroup}`, item]));
  const pageOpportunityByKey = new Map(pageOpportunities.map((item) => [`${item.slug}:${item.subGroup}`, item]));

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="white">콘텐츠 전략 요약</AdminPill>
              <AdminPill tone={urgentGapCount > 0 ? "warning" : "white"}>
                {urgentGapCount > 0 ? "갭 높은 주제 존재" : "급한 갭 적음"}
              </AdminPill>
            </div>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">지금 먼저 다룰 주제와 실행 흐름을 정리합니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              우선 실행, 바로 쓸 브리프, 필요할 때만 보는 근거 데이터를 순서대로 제공합니다.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => updatePanel(activePanel === "rules" ? undefined : "rules")}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
              >
                {activePanel === "rules" ? "추천 원리 접기" : "추천 원리 보기"}
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[480px]">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-medium text-amber-700">시급한 갭</div>
              <div className="mt-1 text-lg font-semibold text-amber-900">{urgentGapCount}건</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="text-xs font-medium text-blue-700">우선 실행</div>
              <div className="mt-1 text-lg font-semibold text-blue-900">{actionableCount}건</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-medium text-emerald-700">실행 브리프</div>
              <div className="mt-1 text-lg font-semibold text-emerald-900">{briefCount}건</div>
            </div>
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-3">
              <div className="text-xs font-medium text-fuchsia-700">근거 데이터</div>
              <div className="mt-1 text-lg font-semibold text-fuchsia-900">{gapRows.length}건</div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] lg:max-w-[480px]">
            위에서 아래로 읽으면 우선 실행 → 브리프 → 근거 데이터 순서로 이어집니다.
          </p>
        </div>

        {topGapItem && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">우선 주제</span>
              </div>
              {topGapItem.searchIntent && <SearchIntentBadge intent={topGapItem.searchIntent} />}
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{topGapItem.subGroup}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              검색량 {calcTotalVolume(topGapItem) ? calcTotalVolume(topGapItem).toLocaleString("ko-KR") : Number(topGapItem.currentAvg).toFixed(1)} · 포스트 {topGapItem.existingPostCount}개 · 갭 점수 {topGapItem.gapScore.toFixed(0)}
            </p>
            {isBlogCategorySlug(topGapItem.slug) && (
              <div className="mt-3">
                <AdminActionButton
                  tone="primary"
                  onClick={() => handleNewPost(topGapItem.slug)}
                  className="min-h-8 px-3 py-1 text-xs"
                >
                  <Target className="h-3.5 w-3.5" />
                  이 카테고리로 새 글 작성
                </AdminActionButton>
              </div>
            )}
          </div>
        )}
      </AdminSurface>

      {activePanel === "rules" && (
        <StrategyRulesPanel embedded onClose={() => updatePanel(undefined)} />
      )}

      {/* ── Section 1: Opportunity scatter ─────────────── */}
      {scatterData.length > 0 && (
        <AdminDisclosureSection
          title="기회 매트릭스"
          description="검색량과 포스트 수로 기회 영역을 봅니다."
          countLabel={`${scatterData.length}개`}
          collapsedMessage="필요할 때만 펼쳐 봅니다."
          titleLevel="h2"
        >
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <OpportunityScatter data={scatterData} onPointClick={handleNewPost} />
          </div>
        </AdminDisclosureSection>
      )}

      {/* ── Section 2: Recommended actions ─────────────── */}
      {(insightActions.length > 0 || pageOpportunities.length > 0 || faqSuggestions.length > 0) && (
        <AdminDisclosureSection
          title="실행 추천"
          description="실행할 액션과 보강 후보를 나눠 보여줍니다."
          countLabel={`${insightActions.length + pageOpportunities.length + faqSuggestions.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 펼쳐 봅니다."
          titleLevel="h2"
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">우선 실행 액션</h3>
              </div>
              <div className="space-y-3">
                {insightActions.slice(0, 5).map((item: InsightActionItem) => (
                  <div key={`${item.slug}-${item.subGroup}-${item.actionType}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <BusinessValueBadge value={item.businessValue} />
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {ACTION_LABELS[item.actionType]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.subGroup}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.reason}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">신뢰도 {item.confidence}</span>
                      <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                        대상 페이지 열기
                      </a>
                    </div>
                  </div>
                ))}
                {!topInsightAction && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">추천 액션이 없습니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">서비스 페이지 보강</h3>
              </div>
              <div className="space-y-3">
                {pageOpportunities.slice(0, 5).map((item: PageUpdateOpportunityItem) => (
                  <div key={`${item.slug}-${item.subGroup}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700">
                        보강 점수 {item.pageUpdateScore}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.subGroup}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      부족 섹션: {item.missingSections.join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      추천 블록: {item.recommendedBlocks.join(" · ")}
                    </p>
                    <div className="mt-2">
                      <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                        서비스 페이지 열기
                      </a>
                    </div>
                  </div>
                ))}
                {!topPageOpportunity && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">보강 후보가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">FAQ 추가 추천</h3>
              </div>
              <div className="space-y-3">
                {faqSuggestions.slice(0, 5).map((item: FaqSuggestionItem) => (
                  <div key={`${item.slug}-${item.subGroup}-${item.question}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        우선순위 {item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{item.question}</p>
                    {item.keywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.keywords.map((keyword) => (
                          <span key={keyword} className="rounded bg-white px-2 py-0.5 text-[10px] text-slate-600">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                        적용 페이지 열기
                      </a>
                    </div>
                  </div>
                ))}
                {!topFaqSuggestion && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">FAQ 추천이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </AdminDisclosureSection>
      )}

      {(blogBriefs.length > 0 || pageBriefs.length > 0) && (
        <AdminDisclosureSection
          title="자동 생성 브리프"
          description="실행 가능한 글/페이지 브리프입니다."
          countLabel={`${blogBriefs.length + pageBriefs.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 펼쳐 봅니다."
          titleLevel="h2"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">블로그 초안 브리프</h3>
              </div>
              <div className="space-y-3">
                {blogBriefs.slice(0, 4).map((item: BlogBriefItem) => (
                  <div key={`${item.slug}-${item.subGroup}-brief`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.targetReader}
                      </span>
                      </div>
                      {item.searchIntent && <span className="text-[11px] text-[var(--muted)]">{item.searchIntent}</span>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.suggestedTitle}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">타깃 키워드: {item.targetKeyword}</p>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {item.outline.slice(0, 3).map((outline) => (
                        <li key={outline}>• {outline}</li>
                      ))}
                    </ul>
                    {item.outline.length > 3 && (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">외 {item.outline.length - 3}개 섹션</p>
                    )}
                    <p className="mt-2 text-xs text-[var(--muted)]">메타 초안: {item.metaDescription}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                    <div className="mt-3 flex justify-end">
                      {isBlogCategorySlug(item.slug) ? (
                        <AdminActionButton
                          type="button"
                          tone="primary"
                          onClick={() => startBriefDraft(item)}
                          className="min-h-8 px-3 py-1 text-xs"
                        >
                          브리프로 작성 시작
                          <ChevronRight className="h-3.5 w-3.5" />
                        </AdminActionButton>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">블로그 카테고리 아님</span>
                      )}
                    </div>
                  </div>
                ))}
                {blogBriefs.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">생성된 블로그 브리프가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">페이지 개편 브리프</h3>
              </div>
              <div className="space-y-3">
                {pageBriefs.slice(0, 4).map((item: PageBriefItem) => (
                  <div key={`${item.slug}-${item.subGroup}-page-brief`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <a
                        href={item.targetPage}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)] hover:underline"
                      >
                        대상 페이지 열기
                      </a>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.subGroup}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">히어로 카피: {item.heroCopy}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">보조 카피: {item.supportingCopy}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.blocks.slice(0, 2).map((block) => (
                        <span key={block} className="rounded bg-white px-2 py-0.5 text-[10px] text-slate-600">{block}</span>
                      ))}
                    </div>
                    {item.blocks.length > 2 && (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">추천 블록 {item.blocks.length}개</p>
                    )}
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      수정 파일: {item.sourceFiles.join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                      <span className="rounded-full bg-white px-2 py-0.5">체크리스트 {item.checklist.length}개</span>
                      <span className="rounded-full bg-white px-2 py-0.5">FAQ {item.faqQuestions.length}개</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                    <div className="mt-3 flex justify-end">
                      <AdminActionButton
                        type="button"
                        tone="dark"
                        onClick={() => openPageBriefWorkspace(item)}
                        className="min-h-8 px-3 py-1 text-xs"
                      >
                        개편 워크노트 열기
                        <ChevronRight className="h-3.5 w-3.5" />
                      </AdminActionButton>
                    </div>
                  </div>
                ))}
                {pageBriefs.length === 0 && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">생성된 페이지 브리프가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </AdminDisclosureSection>
      )}

      {activePanel === "brief" && selectedPageBrief && (
        <PageBriefPanel brief={selectedPageBrief} embedded onClose={() => updatePanel(undefined)} />
      )}

      {activePanel === "brief" && !selectedPageBrief && (
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <h2 className="text-lg font-bold text-[var(--foreground)]">페이지 개편 워크노트</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            브리프 카드에서 “개편 워크노트 열기”를 눌러야 전략 탭 안에서 메모가 열립니다.
          </p>
          <button
            type="button"
            onClick={() => updatePanel(undefined)}
            className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            전략 화면으로 돌아가기
          </button>
        </AdminSurface>
      )}

      {(overviewData.contentGap.length > 0 || crossKeywords.length > 0) && (
        <AdminDisclosureSection
          title="근거 데이터"
          description="왜 이 주제가 중요한지 검색 수요와 교차 신호를 함께 봅니다."
          countLabel={`${gapRows.length}개`}
          defaultOpen={false}
          collapsedMessage="필요할 때만 펼쳐 봅니다."
          titleLevel="h2"
        >
          <div className="space-y-6">
            {crossKeywords.length > 0 && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">교차 키워드</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">여러 카테고리에 걸쳐 반복되는 키워드는 허브 글이나 FAQ 공통 보강 후보입니다.</p>
                </div>
                <div className="rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
                  <DataTable
                    columns={[
                      { key: "keyword", label: "키워드", align: "left" },
                      {
                        key: "categories",
                        label: "카테고리",
                        align: "left",
                        render: (row) => (
                          <div className="flex flex-wrap gap-1">
                            {(row.categories as KeywordCategorySlug[]).map((c) => (
                              <CategoryBadge key={c} category={c} />
                            ))}
                          </div>
                        ),
                      },
                      { key: "categoryCount", label: "카테고리 수", align: "right" },
                      {
                        key: "volume",
                        label: "월 검색량",
                        align: "right",
                        render: (row) => (
                          <span className="tabular-nums">
                            {(row.volume as number).toLocaleString("ko-KR")}
                          </span>
                        ),
                      },
                    ]}
                    rows={crossKeywords as unknown as Record<string, unknown>[]}
                    keyField="keyword"
                    emptyMessage="교차 키워드가 없습니다"
                  />
                </div>
              </section>
            )}

            {overviewData.contentGap.length > 0 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">콘텐츠 갭 분석</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    갭 점수 = 검색량(70%) + 콘텐츠 부족도(25%)
                    &nbsp;·&nbsp;
                    <span className="text-red-600 font-medium">HIGH(≥70): 시급</span>
                    &nbsp;·&nbsp;
                    <span className="text-yellow-600 font-medium">MED(≥40): 권장</span>
                    &nbsp;·&nbsp;
                    <span className="text-green-600 font-medium">LOW(&lt;40)</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {INTENT_FILTER_OPTIONS.map((opt) => {
                      const isActive = intentFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setIntentFilter(opt.value)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-[var(--color-primary)] text-white"
                              : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                          }`}
                        >
                          {opt.label}
                          {isActive && intentFilter !== "all" && (
                            <span className="ml-1 opacity-70">({filteredGap.length})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="hidden sm:block rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
            <DataTable
              columns={[
                {
                  key: "subGroup",
                  label: "키워드 영역",
                  align: "left",
                  render: (row) => {
                    const direct = (row.directKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    const related = (row.relatedKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    const hasKeywords = direct.length > 0 || related.length > 0;
                    return (
                      <div>
                        <span className="font-medium text-[var(--foreground)]">{String(row.subGroup)}</span>
                        {hasKeywords && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {direct.map((dk) => (
                              <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${dk.volume.toLocaleString("ko-KR")}회`}>
                                {dk.keyword}
                                <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                              </span>
                            ))}
                            {related.map((rk) => (
                              <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                                {rk.keyword}
                                <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "category",
                  label: "카테고리",
                  align: "left",
                  render: (row) => <CategoryBadge category={row.category as KeywordCategorySlug} />,
                },
                {
                  key: "searchIntent",
                  label: "검색 의도",
                  align: "left",
                  render: (row) => row.searchIntent
                    ? <SearchIntentBadge intent={row.searchIntent as SearchIntent} />
                    : null,
                },
                {
                  key: "actionType",
                  label: "추천 액션",
                  align: "left",
                  render: (row) => {
                    const item = actionByKey.get(`${row.slug as KeywordCategorySlug}:${String(row.subGroup)}`);
                    if (!item) return <span className="text-xs text-[var(--muted)]">-</span>;
                    return (
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {ACTION_LABELS[item.actionType]}
                        </span>
                        <div>
                          <BusinessValueBadge value={item.businessValue} />
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "monthlyVolume",
                  label: "검색량",
                  align: "right",
                  sortable: true,
                  render: (row) => {
                    const mv = row.monthlyVolume as number | null;
                    const totalVolume = mv != null ? calcTotalVolume(row as unknown as ContentGapItem) : null;
                    const barPct = totalVolume != null ? Math.min(100, (totalVolume / maxVolume) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums font-medium text-[var(--foreground)]">
                          {totalVolume != null ? (
                            <>
                              {row.isEstimated ? "≈ " : ""}
                              {totalVolume.toLocaleString("ko-KR")}
                              <span className="ml-0.5 text-[10px] font-normal text-[var(--muted)]">/월</span>
                            </>
                          ) : (
                            <span className="font-normal text-[var(--muted)]">
                              {Number(row.currentAvg).toFixed(1)}
                              <span className="ml-0.5 text-[10px]">(상대)</span>
                            </span>
                          )}
                        </span>
                        {totalVolume != null && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${barPct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "existingPostCount",
                  label: "포스트 수",
                  align: "right",
                  sortable: true,
                  render: (row) => <span className="tabular-nums text-[var(--foreground)]">{Number(row.existingPostCount)}</span>,
                },
                {
                  key: "gapScore",
                  label: "갭 점수",
                  align: "right",
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="tabular-nums text-[var(--foreground)]">{Number(row.gapScore).toFixed(0)}</span>
                      <GapScoreBadge score={Number(row.gapScore)} />
                    </div>
                  ),
                },
                {
                  key: "pageUpdateScore",
                  label: "페이지 보강",
                  align: "right",
                  render: (row) => {
                    const item = pageOpportunityByKey.get(`${row.slug as KeywordCategorySlug}:${String(row.subGroup)}`);
                    if (!item) return <span className="text-xs text-[var(--muted)]">-</span>;
                    return <span className="tabular-nums text-[var(--foreground)]">{item.pageUpdateScore}</span>;
                  },
                },
              ]}
              rows={gapRows as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyMessage="콘텐츠 갭 데이터가 없습니다"
              sortKey={gapSortKey}
              sortDirection={gapSortDir}
              onSort={handleGapSort}
            />
                </div>
                <div className="block sm:hidden space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {([
                      { key: "monthlyVolume", label: "검색량" },
                      { key: "gapScore", label: "갭 점수" },
                    ] as const).map((chip) => {
                      const isActive = gapSortKey === chip.key;
                      return (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => handleGapSort(chip.key)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            isActive
                              ? "bg-[var(--color-primary)] text-white"
                              : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                          }`}
                        >
                          {chip.label}
                          {isActive && <span className="ml-0.5">{gapSortDir === "desc" ? "↓" : "↑"}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {gapRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--muted)]">콘텐츠 갭 데이터가 없습니다</p>
                  ) : (
                    gapRows.map((item) => {
                      const totalVolume = item.monthlyVolume != null ? calcTotalVolume(item) : null;
                      const direct = item.directKeywords ?? [];
                      const related = item.relatedKeywords ?? [];
                      const hasKeywords = direct.length > 0 || related.length > 0;
                      const action = actionByKey.get(`${item.slug}:${item.subGroup}`);
                      const pageOpportunity = pageOpportunityByKey.get(`${item.slug}:${item.subGroup}`);
                      return (
                        <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0"><CategoryBadge category={item.category} /></span>
                            {item.searchIntent && <span className="shrink-0"><SearchIntentBadge intent={item.searchIntent} /></span>}
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{item.subGroup}</span>
                            <span className="flex shrink-0 items-center gap-1">
                              <span className="text-xs tabular-nums text-[var(--foreground)]">
                                {totalVolume != null ? (
                                  <>{item.isEstimated ? "≈" : ""}{totalVolume.toLocaleString("ko-KR")}<span className="text-[var(--muted)]">/월</span></>
                                ) : (
                                  <span className="text-[var(--muted)]">{item.currentAvg.toFixed(1)}<span className="text-[9px]">(상대)</span></span>
                                )}
                              </span>
                              <GapScoreBadge score={item.gapScore} />
                            </span>
                          </div>
                          {(action || pageOpportunity) && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {action && (
                                <>
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                    {ACTION_LABELS[action.actionType]}
                                  </span>
                                  <BusinessValueBadge value={action.businessValue} />
                                </>
                              )}
                              {pageOpportunity && (
                                <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">
                                  페이지 {pageOpportunity.pageUpdateScore}
                                </span>
                              )}
                            </div>
                          )}
                          {hasKeywords && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {direct.map((dk) => (
                                <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                                  {dk.keyword}
                                  <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                                </span>
                              ))}
                              {related.map((rk) => (
                                <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                                  {rk.keyword}
                                  <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        </AdminDisclosureSection>
      )}

      {/* ── Empty state ───────────────────────────────── */}
      {overviewData.contentGap.length === 0 && actionableCount === 0 && briefCount === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            아직 전략 화면에 표시할 콘텐츠 우선순위 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
