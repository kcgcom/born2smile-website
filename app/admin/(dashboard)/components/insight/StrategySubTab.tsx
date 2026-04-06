"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronRight, FileQuestion, Lightbulb, NotebookPen, Sparkles, Target, Wrench } from "lucide-react";
import { isBlogCategorySlug } from "@/lib/blog";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import { useAdminApi } from "../useAdminApi";
import { DataTable } from "../DataTable";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { BusinessValueBadge, CategoryBadge, GapScoreBadge, PriorityBadge, SearchIntentBadge, calcTotalVolume } from "./shared";
import type { BlogBriefItem, ContentGapItem, FaqSuggestionItem, InsightActionItem, OverviewData, PageBriefItem, PageUpdateOpportunityItem } from "./shared";
import type { SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { BLOG_EDITOR_PREFILL_KEY, PAGE_BRIEF_WORKNOTE_KEY } from "../blog/blog-editor-draft";
import type { BlogBlock, BlogTag } from "@/lib/blog/types";

// ---------------------------------------------------------------
// Opportunity Scatter Chart
// ---------------------------------------------------------------

const CATEGORY_SCATTER_COLORS: Record<KeywordCategorySlug, string> = {
  implant: "#2563EB",
  orthodontics: "#C9962B",
  prosthetics: "#16A34A",
  restorative: "#9333EA",
  prevention: "#0891B2",
  pediatric: "#DC2626",
  "health-tips": "#EA580C",
  "dental-choice": "#D946EF",
};

interface ScatterPoint {
  subGroup: string;
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  x: number;
  y: number;
  z: number;
  searchIntent?: SearchIntent;
}

const OpportunityScatter = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data, onPointClick }: { data: ScatterPoint[]; onPointClick: (slug: KeywordCategorySlug) => void }) {
        if (data.length === 0) {
          return (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              검색량 데이터가 있는 항목이 없습니다
            </p>
          );
        }

        const categories = [...new Set(data.map((d) => d.category))] as KeywordCategorySlug[];

        return (
          <div>
            <mod.ResponsiveContainer width="100%" height={360}>
              <mod.ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: 4 }}>
                <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <mod.XAxis
                  type="number"
                  dataKey="x"
                  name="검색량"
                  scale="log"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  label={{ value: "월 검색량", position: "bottom", offset: 4, fontSize: 11, fill: "#6B7280" }}
                />
                <mod.YAxis
                  type="number"
                  dataKey="y"
                  name="포스트 수"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  label={{ value: "포스트 수", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#6B7280" }}
                />
                <mod.ZAxis type="number" dataKey="z" range={[60, 400]} />
                <mod.Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload as ScatterPoint;
                    const intentStyles: Record<SearchIntent, { label: string; className: string }> = {
                      informational: { label: "정보형", className: "bg-blue-100 text-blue-700" },
                      commercial:    { label: "비교/검토", className: "bg-orange-100 text-orange-700" },
                      transactional: { label: "전환형", className: "bg-green-100 text-green-700" },
                      navigational:  { label: "탐색형", className: "bg-gray-100 text-gray-600" },
                    };
                    const intentStyle = d.searchIntent ? intentStyles[d.searchIntent] : null;
                    return (
                      <div className="rounded-lg border border-[var(--border)] bg-white p-2 shadow text-xs">
                        <p className="font-semibold">{d.subGroup}</p>
                        <p className="text-[var(--muted)]">{d.category}</p>
                        {intentStyle && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${intentStyle.className}`}>
                            {intentStyle.label}
                          </span>
                        )}
                        <p>검색량: {d.x.toLocaleString("ko-KR")}/월</p>
                        <p>포스트: {d.y}개</p>
                        <p>갭 점수: {d.z.toFixed(0)}</p>
                      </div>
                    );
                  }}
                />
                {categories.map((cat) => (
                  <mod.Scatter
                    key={cat}
                    name={cat}
                    data={data.filter((d) => d.category === cat)}
                    fill={CATEGORY_SCATTER_COLORS[cat] ?? "#6B7280"}
                    fillOpacity={0.7}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(point: any) => {
                      if (point?.slug) onPointClick(point.slug);
                    }}
                    cursor="pointer"
                  />
                ))}
                <mod.Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </mod.ScatterChart>
            </mod.ResponsiveContainer>
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              우측 하단(검색량 높음 + 포스트 적음) = 기회 영역 · 점 크기 = 갭 점수 · 클릭하면 새 포스트 작성
            </p>
          </div>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Sort state management for content gap table
// ---------------------------------------------------------------

type GapSortKey = "gapScore" | "existingPostCount" | "currentAvg" | "monthlyVolume";

function useGapTableSort(initial: GapSortKey = "gapScore") {
  const [sortKey, setSortKey] = useState<GapSortKey>(initial);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = useCallback(
    (key: string) => {
      const k = key as GapSortKey;
      if (k === sortKey) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(k);
        setSortDirection("desc");
      }
    },
    [sortKey],
  );

  const sort = useCallback(
    (rows: ContentGapItem[]) =>
      [...rows].sort((a, b) => {
        const av =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (calcTotalVolume(a) || a.currentAvg)
            : (a[sortKey] as number);
        const bv =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (calcTotalVolume(b) || b.currentAvg)
            : (b[sortKey] as number);
        const dir = sortDirection === "asc" ? 1 : -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      }),
    [sortKey, sortDirection],
  );

  return { sortKey, sortDirection, handleSort, sort };
}

// ---------------------------------------------------------------
// Main StrategySubTab component
// ---------------------------------------------------------------

const INTENT_FILTER_OPTIONS: Array<{ value: SearchIntent | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "informational", label: "정보형" },
  { value: "commercial", label: "비교/검토" },
  { value: "transactional", label: "전환형" },
  { value: "navigational", label: "탐색형" },
];

const ACTION_LABELS: Record<InsightActionItem["actionType"], string> = {
  "new-post": "새 글 작성",
  "update-service-page": "서비스 페이지 보강",
  "expand-faq": "FAQ 확장",
  "strengthen-cta": "CTA 강화",
  "seasonal-campaign": "시즌 캠페인",
};

export function StrategySubTab() {
  const router = useRouter();
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
    router.push("/admin/content/strategy/brief");
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

  // Gap lookup map for suggestions (avoids O(n*m) find in render)
  const gapBySlug = useMemo(() => {
    const map = new Map<string, ContentGapItem[]>();
    for (const g of (overviewData?.contentGap ?? [])) {
      const list = map.get(g.slug) ?? [];
      list.push(g);
      map.set(g.slug, list);
    }
    return map;
  }, [overviewData?.contentGap]);

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

  const suggestions = overviewData.suggestions;
  const urgentGapCount = filteredGap.filter((item) => item.gapScore >= 70).length;
  const topGapItem = gapRows[0] ?? null;
  const topPageOpportunity = pageOpportunities[0] ?? null;
  const topInsightAction = insightActions[0] ?? null;
  const topFaqSuggestion = faqSuggestions[0] ?? null;
  const topBlogBrief = blogBriefs[0] ?? null;
  const topPageBrief = pageBriefs[0] ?? null;
  const actionByKey = new Map(insightActions.map((item) => [`${item.slug}:${item.subGroup}`, item]));
  const pageOpportunityByKey = new Map(pageOpportunities.map((item) => [`${item.slug}:${item.subGroup}`, item]));

  // ── Cross-keyword analysis ───────────────────────────────────
  const crossKeywords = (() => {
    const kwCatMap = new Map<string, { categories: Set<string>; volume: number }>();
    for (const gap of overviewData.contentGap) {
      for (const kw of [...(gap.directKeywords ?? []), ...(gap.relatedKeywords ?? [])]) {
        const entry = kwCatMap.get(kw.keyword) ?? { categories: new Set(), volume: 0 };
        entry.categories.add(gap.category);
        entry.volume = Math.max(entry.volume, kw.volume);
        kwCatMap.set(kw.keyword, entry);
      }
    }
    return [...kwCatMap.entries()]
      .filter(([, v]) => v.categories.size >= 2)
      .sort((a, b) => b[1].categories.size - a[1].categories.size || b[1].volume - a[1].volume)
      .slice(0, 20)
      .map(([keyword, v]) => ({
        keyword,
        categories: [...v.categories],
        categoryCount: v.categories.size,
        volume: v.volume,
      }));
  })();

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
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">검색 수요 대비 비어 있는 주제를 먼저 보여줍니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              월 검색량, 기존 포스트 수, 갭 점수를 합쳐 지금 새 글을 써야 할 영역을 빠르게 판단할 수 있게 정리했습니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[480px]">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-medium text-amber-700">시급한 갭</div>
              <div className="mt-1 text-lg font-semibold text-amber-900">{urgentGapCount}건</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="text-xs font-medium text-blue-700">추천 주제</div>
              <div className="mt-1 text-lg font-semibold text-blue-900">{suggestions.length}건</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-medium text-emerald-700">교차 키워드</div>
              <div className="mt-1 text-lg font-semibold text-emerald-900">{crossKeywords.length}건</div>
            </div>
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-3">
              <div className="text-xs font-medium text-fuchsia-700">페이지 보강 후보</div>
              <div className="mt-1 text-lg font-semibold text-fuchsia-900">{pageOpportunities.length}건</div>
            </div>
          </div>
        </div>

        {topGapItem && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">가장 먼저 볼 주제 영역</span>
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{topGapItem.subGroup}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              검색량 {calcTotalVolume(topGapItem) ? calcTotalVolume(topGapItem).toLocaleString("ko-KR") : Number(topGapItem.currentAvg).toFixed(1)} · 포스트 {topGapItem.existingPostCount}개 · 갭 점수 {topGapItem.gapScore.toFixed(0)}
            </p>
            {isBlogCategorySlug(topGapItem.slug) && (
              <div className="mt-3">
                <AdminActionButton
                  tone="dark"
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

      {/* ── Section 1: Opportunity scatter ─────────────── */}
      {scatterData.length > 0 && (
        <AdminDisclosureSection
          title="기회 매트릭스"
          description="검색량과 포스트 수를 같이 봐서, 우측 하단의 비어 있는 기회 영역을 빠르게 찾습니다."
          countLabel={`${scatterData.length}개`}
          collapsedMessage="필요할 때만 기회 매트릭스 차트를 펼쳐 볼 수 있습니다."
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
          description="검색 수요를 실제 사이트 개선 작업으로 바로 연결할 수 있게 액션, 페이지 보강, FAQ 후보를 나눠 보여줍니다."
          countLabel={`${insightActions.length + pageOpportunities.length + faqSuggestions.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 실행 추천 패널을 펼쳐 볼 수 있습니다."
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
          description="키워드 기회와 페이지 보강 후보를 바로 실행 가능한 글 초안/페이지 개편 메모 형태로 정리했습니다."
          countLabel={`${blogBriefs.length + pageBriefs.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 자동 생성 브리프를 펼쳐 볼 수 있습니다."
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
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={item.slug} />
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {item.targetReader}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.suggestedTitle}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">타깃 키워드: {item.targetKeyword}</p>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {item.outline.map((outline) => (
                        <li key={outline}>• {outline}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-[var(--muted)]">메타 초안: {item.metaDescription}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                    <div className="mt-3 flex justify-end">
                      {isBlogCategorySlug(item.slug) ? (
                        <button
                          type="button"
                          onClick={() => startBriefDraft(item)}
                          className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                        >
                          브리프로 작성 시작
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">블로그 카테고리 아님</span>
                      )}
                    </div>
                  </div>
                ))}
                {!topBlogBrief && (
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
                      <a href={item.targetPage} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[var(--color-primary)] hover:underline">
                        {item.targetPage}
                      </a>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.subGroup}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">히어로 카피: {item.heroCopy}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">보조 카피: {item.supportingCopy}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.blocks.map((block) => (
                        <span key={block} className="rounded bg-white px-2 py-0.5 text-[10px] text-slate-600">{block}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      수정 파일: {item.sourceFiles.join(" · ")}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {item.checklist.slice(0, 2).map((check) => (
                        <li key={check}>• {check}</li>
                      ))}
                    </ul>
                    {item.faqQuestions.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                        {item.faqQuestions.map((question) => (
                          <li key={question}>• {question}</li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-xs text-[var(--muted)]">CTA: {item.cta}</p>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openPageBriefWorkspace(item)}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                      >
                        개편 워크노트 열기
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {!topPageBrief && (
                  <p className="py-8 text-center text-sm text-[var(--muted)]">생성된 페이지 브리프가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </AdminDisclosureSection>
      )}

      {/* ── Section 3: Cross-keyword analysis ──────────── */}
      {crossKeywords.length > 0 && (
        <AdminDisclosureSection
          title="교차 키워드 분석"
          description="2개 이상 카테고리에 걸친 키워드를 분리해 중복 경쟁과 주제 충돌 가능성을 확인합니다."
          countLabel={`${crossKeywords.length}개`}
          collapsedMessage="필요할 때만 교차 키워드 표를 펼쳐 볼 수 있습니다."
          titleLevel="h2"
        >
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
        </AdminDisclosureSection>
      )}

      {/* ── Section 3: Content gap table ──────────────── */}
      {overviewData.contentGap.length > 0 && (
        <AdminDisclosureSection
          title="콘텐츠 갭 분석"
          description="검색 수요와 현재 콘텐츠 수를 비교해 새 글 작성 우선순위를 정합니다."
          countLabel={`${gapRows.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 갭 분석 표와 필터를 펼쳐 볼 수 있습니다."
          titleLevel="h2"
        >
          <div className="mb-3">
            <p className="mt-1 text-xs text-[var(--muted)]">
              갭 점수 = 검색량(70%) + 콘텐츠 부족도(25%)
              &nbsp;·&nbsp;
              <span className="text-red-600 font-medium">HIGH(≥70): 시급</span>
              &nbsp;·&nbsp;
              <span className="text-yellow-600 font-medium">MED(≥40): 권장</span>
              &nbsp;·&nbsp;
              <span className="text-green-600 font-medium">LOW(&lt;40)</span>
            </p>
            {/* Intent filter chips */}
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
          {/* Desktop: DataTable (sm and above) */}
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

          {/* Mobile: Card list (below sm) */}
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
        </AdminDisclosureSection>
      )}

      {/* ── Section 4: Topic suggestions ──────────────── */}
      {suggestions.length > 0 && (
        <AdminDisclosureSection
          title="추천 블로그 주제"
          description="검색량과 콘텐츠 갭을 바탕으로 바로 작성할 만한 블로그 아이디어를 추렸습니다."
          countLabel={`${suggestions.length}개`}
          defaultOpen={true}
          collapsedMessage="필요할 때만 추천 주제 목록을 펼쳐 볼 수 있습니다."
          titleLevel="h2"
        >
          <div className="space-y-3">
            {suggestions.slice(0, 15).map((item) => (
              <div key={`${item.rank}-${item.slug}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--muted)]">{item.rank}</span>
                  <PriorityBadge priority={item.priority} />
                  <CategoryBadge category={item.category} />
                  {(() => {
                    const gap = (gapBySlug.get(item.slug) ?? []).find(
                      (g) => g.keywords.some((k) => item.keywords.includes(k)),
                    );
                    if (!gap?.monthlyVolume) return null;
                    return (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 tabular-nums">
                        {gap.monthlyVolume.toLocaleString("ko-KR")}/월
                      </span>
                    );
                  })()}
                </div>
                <p className="mb-1.5 text-sm font-semibold text-[var(--foreground)] leading-snug">{item.suggestedTitle}</p>
                <p className="mb-2 text-xs text-[var(--muted)] leading-relaxed">{item.reasoning}</p>
                {item.keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {item.keywords.slice(0, 5).map((kw) => (
                      <span key={kw} className="rounded bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">{kw}</span>
                    ))}
                    {(() => {
                      const gap = (gapBySlug.get(item.slug) ?? []).find(
                        (g) => g.keywords.some((k) => item.keywords.includes(k)),
                      );
                      const related = (gap?.relatedKeywords ?? []).filter(
                        (rk) => !item.keywords.includes(rk.keyword),
                      );
                      if (related.length === 0) return null;
                      return related.slice(0, 3).map((rk) => (
                        <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700" title={`연관 키워드 · 월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                          {rk.keyword}
                          <span className="ml-0.5 text-blue-400 tabular-nums text-[10px]">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                        </span>
                      ));
                    })()}
                  </div>
                )}
                <div className="flex justify-end">
                  {isBlogCategorySlug(item.slug) ? (
                    <button
                      type="button"
                      onClick={() => handleNewPost(item.slug)}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      새 포스트 작성
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">키워드 전용 카테고리</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminDisclosureSection>
      )}

      {/* ── Empty state ───────────────────────────────── */}
      {overviewData.contentGap.length === 0 && suggestions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            콘텐츠 갭 분석과 주제 추천 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
