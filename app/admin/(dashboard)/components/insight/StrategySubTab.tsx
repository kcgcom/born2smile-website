"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lightbulb, Target } from "lucide-react";
import { isBlogCategorySlug } from "@/lib/blog";
import type { KeywordCategorySlug } from "@/lib/admin-naver-datalab-keywords";
import { useAdminApi } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { SearchIntentBadge, calcTotalVolume } from "./shared";
import type { BlogBriefItem, PageBriefItem, StrategyOverviewData } from "./shared";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { BLOG_EDITOR_PREFILL_KEY, PAGE_BRIEF_WORKNOTE_KEY } from "../blog/blog-editor-draft";
import type { BlogBlock, BlogTag } from "@/lib/blog/types";
import { PageBriefPanel } from "./strategy-panels";
import { RecommendedActionsSection } from "./strategy-actions";
import { BriefsSection } from "./strategy-briefs";

export function StrategySubTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
  } = useAdminApi<StrategyOverviewData>("/api/admin/naver-datalab/strategy-overview");
  const insightActions = overviewData?.insightActions ?? [];
  const faqSuggestions = overviewData?.faqSuggestions ?? [];
  const pageOpportunities = overviewData?.pageOpportunities ?? [];
  const blogBriefs = overviewData?.blogBriefs ?? [];
  const pageBriefs = overviewData?.pageBriefs ?? [];

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

  const updatePanel = (panel?: "brief") => {
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

  const contentGap = overviewData.contentGap;
  const urgentGapCount = contentGap.filter((item) => item.gapScore >= 70).length;
  const topGapItem = contentGap[0] ?? null;
  const actionableCount = insightActions.length + pageOpportunities.length + faqSuggestions.length;
  const briefCount = blogBriefs.length + pageBriefs.length;

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="white">콘텐츠 전략</AdminPill>
              <AdminPill tone={urgentGapCount > 0 ? "warning" : "white"}>
                {urgentGapCount > 0 ? "갭 높은 주제 존재" : "급한 갭 적음"}
              </AdminPill>
            </div>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">우선순위와 실행안을 정리합니다.</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              검색량 기반 갭 분석과 실행 브리프를 확인합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[480px]">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="text-xs font-medium text-amber-700">시급한 갭</div>
              <div className="mt-1 text-lg font-semibold text-amber-900">{urgentGapCount}건</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="text-xs font-medium text-blue-700">실행 항목</div>
              <div className="mt-1 text-lg font-semibold text-blue-900">{actionableCount}건</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-medium text-emerald-700">실행 브리프</div>
              <div className="mt-1 text-lg font-semibold text-emerald-900">{briefCount}건</div>
            </div>
            <a
              href="/admin/content/strategy/evidence"
              className="group rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-3 transition-colors hover:bg-fuchsia-100"
            >
              <div className="text-xs font-medium text-fuchsia-700">근거 데이터</div>
              <div className="mt-1 text-lg font-semibold text-fuchsia-900">{contentGap.length}건</div>
              <div className="mt-1 text-[10px] font-medium text-fuchsia-500 group-hover:text-fuchsia-700">상세 보기 →</div>
            </a>
          </div>
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

      <RecommendedActionsSection
        insightActions={insightActions}
        pageOpportunities={pageOpportunities}
        faqSuggestions={faqSuggestions}
      />

      <BriefsSection
        blogBriefs={blogBriefs}
        pageBriefs={pageBriefs}
        onStartBriefDraft={startBriefDraft}
        onOpenPageBriefWorkspace={openPageBriefWorkspace}
      />

      {activePanel === "brief" && selectedPageBrief && (
        <PageBriefPanel brief={selectedPageBrief} embedded onClose={() => updatePanel(undefined)} />
      )}

      {activePanel === "brief" && !selectedPageBrief && (
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <h2 className="text-lg font-bold text-[var(--foreground)]">페이지 보강 워크노트</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            브리프 카드에서 &ldquo;보강 워크노트 열기&rdquo;를 눌러야 전략 탭 안에서 메모가 열립니다.
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

      {/* ── Empty state ───────────────────────────────── */}
      {contentGap.length === 0 && actionableCount === 0 && briefCount === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            아직 전략 화면에 표시할 콘텐츠 우선순위 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
