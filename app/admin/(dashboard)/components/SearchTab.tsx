"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Search, Sparkles } from "lucide-react";
import { isBlogCategorySlug } from "@/lib/blog/category-slugs";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import {
  KeywordBarChart,
  PageQueryDrilldown,
  PERIODS,
  QueryPageDrilldown,
  formatCtr,
  getEditableBlogSlug,
  getMetaChecklist,
  getQueryActionRecommendation,
  hasQuery,
  useSearchTableSort,
  type SearchConsoleData,
} from "./search/shared";

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function SearchTab() {
  const router = useRouter();
  const [period, setPeriod] = useState<"7d" | "28d" | "90d">("28d");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [selectedTopPage, setSelectedTopPage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminApi<SearchConsoleData>(
    `/api/admin/search-console?period=${period}`,
  );

  const querySort = useSearchTableSort(data?.topQueries ?? []);
  const pageSort = useSearchTableSort(data?.topPages ?? []);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "7d" | "28d" | "90d");
    setSelectedQuery(null);
    setSelectedTopPage(null);
  };

  const handleEditBlog = (slug: string) => {
    router.push(`/admin/content/posts/${encodeURIComponent(slug)}`);
  };

  const handleCreateRelatedPost = (category?: string | null) => {
    if (category && isBlogCategorySlug(category)) {
      router.push(`/admin/content/posts/new?category=${encodeURIComponent(category)}`);
      return;
    }
    router.push("/admin/content/posts/new");
  };

  const metaImprovementPages = useMemo(() => {
    return (data?.topPages ?? [])
      .filter((row) => row.impressions >= 80 && row.ctr < 2.5)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data?.topPages]);

  const rankingOpportunityQueries = useMemo(() => {
    return (data?.topQueries ?? [])
      .filter((row) => row.impressions >= 50 && row.position >= 4 && row.position <= 15)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data?.topQueries]);

  const hasPriorityItems =
    metaImprovementPages.length > 0 ||
    rankingOpportunityQueries.length > 0;

  const selectedQueryPages = selectedQuery
    ? data?.queryTopPages[selectedQuery] ?? []
    : [];
  const selectedTopPageQueries = selectedTopPage
    ? data?.pageTopQueries[selectedTopPage] ?? []
    : [];
  const selectedTopPageMetrics = selectedTopPage
    ? data?.topPages.find((item) => item.page === selectedTopPage)
    : undefined;
  const topOpportunity:
    | SearchConsoleData["topPages"][number]
    | SearchConsoleData["topQueries"][number]
    | null =
    rankingOpportunityQueries[0] ?? metaImprovementPages[0] ?? null;
  const topBlogPage = data?.blogPages[0] ?? null;
  const topOpportunityLabel = topOpportunity
    ? ("query" in (topOpportunity as Record<string, unknown>)
      ? (topOpportunity as SearchConsoleData["topQueries"][number]).query
      : ((topOpportunity as unknown) as { page: string }).page)
    : null;
  const topOpportunityPage =
    topOpportunity && "page" in (topOpportunity as Record<string, unknown>)
      ? ((topOpportunity as unknown) as { page: string }).page
      : null;

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["searchConsole"]} />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector periods={PERIODS} selected={period} onChange={handlePeriodChange} />
        {data?.period && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            집계 기간: {data.period.start} ~ {data.period.end}
          </span>
        )}
        {data?.siteUrl && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            🔎 속성: {data.siteUrl}
            {data.configuredSiteUrl !== data.siteUrl ? " (자동 전환)" : ""}
          </span>
        )}
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf} (2~3일 지연)
          </span>
        )}
        <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
          Search Console 지연 때문에 트래픽 탭과 실제 날짜 범위가 완전히 같지 않을 수 있습니다.
        </span>
      </div>

      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {!loading && !error && data && (
        <>
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminPill tone="white">검색 성과 요약</AdminPill>
                  <AdminPill tone={hasPriorityItems ? "warning" : "white"}>
                    {hasPriorityItems ? "즉시 확인 필요" : "급한 항목 적음"}
                  </AdminPill>
                </div>
                <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">우선 볼 항목만 올렸습니다.</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  클릭이 약한 항목과 빠르게 손볼 후보를 먼저 보여줍니다.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-medium text-amber-700">메타 개선 후보</div>
                  <div className="mt-1 text-lg font-semibold text-amber-900">{metaImprovementPages.length}건</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-medium text-blue-700">순위 상승 여지</div>
                  <div className="mt-1 text-lg font-semibold text-blue-900">{rankingOpportunityQueries.length}건</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-medium text-emerald-700">블로그 요약</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-900">{data.blogPages.length}개</div>
                </div>
              </div>
            </div>

            {topOpportunity && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">우선 후보</span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {topOpportunityLabel}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  노출 {topOpportunity.impressions.toLocaleString("ko-KR")} · 클릭 {topOpportunity.clicks.toLocaleString("ko-KR")} · CTR {topOpportunity.ctr}% · 순위 {topOpportunity.position}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topOpportunityPage && getEditableBlogSlug(topOpportunityPage) && (
                    <AdminActionButton
                      tone="dark"
                      onClick={() => handleEditBlog(getEditableBlogSlug(topOpportunityPage)!)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      이 글 수정
                    </AdminActionButton>
                  )}
                  {hasQuery(topOpportunity) && (
                    <AdminActionButton
                      tone="dark"
                      onClick={() => setSelectedQuery(topOpportunity.query)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      <Search className="h-3.5 w-3.5" />
                      연결 페이지 보기
                    </AdminActionButton>
                  )}
                </div>
              </div>
            )}
          </AdminSurface>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="총 노출"
              value={data.summary.impressions.value.toLocaleString("ko-KR")}
              change={data.summary.impressions.change}
            />
            <MetricCard
              label="총 클릭"
              value={data.summary.clicks.value.toLocaleString("ko-KR")}
              change={data.summary.clicks.change}
            />
            <MetricCard
              label="평균 CTR"
              value={`${data.summary.ctr.value}%`}
              change={data.summary.ctr.change}
            />
            <MetricCard
              label="평균 순위"
              value={data.summary.position.value}
              change={data.summary.position.change}
              invertChange={true}
            />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  지금 우선 조치할 항목
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  지금 바로 손볼 항목만 추렸습니다.
                </p>
              </div>
              <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                자동 진단
              </span>
            </div>

            {hasPriorityItems ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">메타 개선 후보</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">CTR 보완 효과가 큰 페이지</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      {metaImprovementPages.length}건
                    </span>
                  </div>
                  {metaImprovementPages.length > 0 ? (
                    <ul className="space-y-3">
                      {metaImprovementPages.map((row) => (
                        <li key={row.page} className="rounded-xl bg-white/80 p-3">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]" title={row.page}>{row.page}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            노출 {row.impressions.toLocaleString("ko-KR")} · 클릭 {row.clicks.toLocaleString("ko-KR")} · CTR {row.ctr}%
                          </p>
                          <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                            {getMetaChecklist(row.page, row).map((item) => (
                              <li key={`${row.page}-${item}`}>• {item}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">지금은 메타 우선 후보가 없습니다.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">순위 상승 여지 키워드</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">본문 보강으로 올리기 좋은 검색어</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {rankingOpportunityQueries.length}건
                    </span>
                  </div>
                  {rankingOpportunityQueries.length > 0 ? (
                    <ul className="space-y-3">
                      {rankingOpportunityQueries.map((row) => {
                        const recommendation = getQueryActionRecommendation(
                          row.query,
                          data.queryTopPages[row.query],
                        );
                        return (
                        <li key={row.query} className="rounded-xl bg-white/80 p-3">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]" title={row.query}>{row.query}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            순위 {row.position} · 노출 {row.impressions.toLocaleString("ko-KR")} · CTR {row.ctr}%
                          </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${
                                  recommendation.kind === "edit"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : recommendation.kind === "new"
                                      ? "bg-blue-50 text-blue-700 ring-blue-100"
                                      : "bg-slate-100 text-slate-700 ring-slate-200"
                                }`}
                              >
                                {recommendation.label}
                              </span>
                              <span className="text-[11px] text-[var(--muted)]">
                                {recommendation.description}
                              </span>
                            </div>
                            {recommendation.kind === "new" && recommendation.suggestedTitles && (
                              <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                                {recommendation.suggestedTitles.slice(0, 2).map((title) => (
                                  <li key={`${row.query}-${title}`}>• {title}</li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recommendation.kind === "edit" && recommendation.slug && (
                                <button
                                  type="button"
                                  onClick={() => handleEditBlog(recommendation.slug!)}
                                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                >
                                  기존 글 수정
                                </button>
                              )}
                              {recommendation.kind === "new" && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateRelatedPost(recommendation.category)}
                                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                >
                                  관련 글 작성
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">지금은 순위 상승 후보가 뚜렷하지 않습니다.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)] shadow-sm ring-1 ring-[var(--border)]/80">
                현재 데이터 기준으로 급한 개선 후보는 많지 않습니다. 아래 표에서 CTR/순위 정렬로 세부 항목을 확인해보세요.
              </div>
            )}
          </section>

          <AdminDisclosureSection
            title="상위 검색 키워드"
            description="키워드와 연결 페이지를 바로 확인합니다."
            countLabel={`${data.topQueries.length}개`}
            collapsedMessage="필요할 때만 펼쳐 봅니다."
          >
            {data.topQueries.length > 0 && (
              <div className="mb-4 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <KeywordBarChart data={data.topQueries} />
              </div>
            )}
            <DataTable
              columns={[
                {
                  key: "query",
                  label: "키워드",
                  align: "left",
                  render: (row) => {
                    const query = String((row as { query: string }).query);
                    const isSelected = selectedQuery === query;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedQuery((current) =>
                            current === query ? null : query,
                          )
                        }
                        className={`block max-w-[220px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={query}
                      >
                        {query}
                      </button>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right", sortable: true },
                { key: "clicks", label: "클릭", align: "right", sortable: true },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  sortable: true,
                  render: (row) => formatCtr((row as SearchConsoleData["topQueries"][number]).ctr),
                },
                { key: "position", label: "순위", align: "right", sortable: true },
              ]}
              rows={querySort.sortedRows as unknown as Record<string, unknown>[]}
              keyField="query"
              emptyMessage="검색 키워드 데이터가 없습니다"
              sortKey={querySort.sortKey}
              sortDirection={querySort.sortDirection}
              onSort={querySort.handleSort}
              scrollClassName="max-h-[36rem] overflow-y-auto"
              stickyHeader={true}
            />
            {selectedQuery && (
              <QueryPageDrilldown
                query={selectedQuery}
                pages={selectedQueryPages}
                onClose={() => setSelectedQuery(null)}
                onEditBlog={handleEditBlog}
                onCreatePost={handleCreateRelatedPost}
              />
            )}
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="상위 페이지별 검색 성과"
            description="주요 페이지 성과를 비교합니다."
            countLabel={`${data.topPages.length}개`}
            collapsedMessage="필요할 때만 펼쳐 봅니다."
          >
            <DataTable
              columns={[
                {
                  key: "page",
                  label: "페이지",
                  align: "left",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    const isSelected = selectedTopPage === page;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTopPage((current) =>
                            current === page ? null : page,
                          )
                        }
                        className={`block max-w-[200px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={page}
                      >
                        {page}
                      </button>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right", sortable: true },
                { key: "clicks", label: "클릭", align: "right", sortable: true },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  sortable: true,
                  render: (row) => formatCtr((row as SearchConsoleData["topPages"][number]).ctr),
                },
                { key: "position", label: "순위", align: "right", sortable: true },
              ]}
              rows={pageSort.sortedRows as unknown as Record<string, unknown>[]}
              keyField="page"
              emptyMessage="페이지 데이터가 없습니다"
              sortKey={pageSort.sortKey}
              sortDirection={pageSort.sortDirection}
              onSort={pageSort.handleSort}
            />
            {selectedTopPage && (
              <PageQueryDrilldown
                page={selectedTopPage}
                queries={selectedTopPageQueries}
                onClose={() => setSelectedTopPage(null)}
                metrics={selectedTopPageMetrics}
              />
            )}
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="블로그 검색 성과 요약"
            description="블로그 상세 분석과 리라이트 후보는 콘텐츠 탭에서 이어서 확인합니다."
            countLabel={`${data.blogPages.length}개`}
            defaultOpen={true}
            collapsedMessage="블로그 분석은 콘텐츠 탭에서 더 깊게 볼 수 있습니다."
          >
            <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">블로그는 콘텐츠 탭에서 깊게 봅니다.</h4>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    포스트별 대표 쿼리, 연결 페이지, 리라이트 후보는 콘텐츠 탭으로 옮겼습니다.
                  </p>
                  {topBlogPage && (
                    <p className="mt-3 text-sm text-[var(--foreground)]">
                      현재 상위 블로그 페이지: <span className="font-medium">{topBlogPage.page}</span>
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[260px]">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="text-xs font-medium text-emerald-700">블로그 페이지</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-900">{data.blogPages.length}개</div>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                    <div className="text-xs font-medium text-sky-700">블로그 노출</div>
                    <div className="mt-1 text-lg font-semibold text-sky-900">
                      {data.blogPages.reduce((sum, row) => sum + row.impressions, 0).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                    <div className="text-xs font-medium text-violet-700">블로그 클릭</div>
                    <div className="mt-1 text-lg font-semibold text-violet-900">
                      {data.blogPages.reduce((sum, row) => sum + row.clicks, 0).toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminActionButton
                  tone="dark"
                  onClick={() => router.push("/admin/content/posts")}
                  className="min-h-8 px-3 py-1 text-xs"
                >
                  블로그 성과 상세 보기
                </AdminActionButton>
                {topBlogPage && getEditableBlogSlug(topBlogPage.page) && (
                  <AdminActionButton
                    tone="dark"
                    onClick={() => handleEditBlog(getEditableBlogSlug(topBlogPage.page)!)}
                    className="min-h-8 px-3 py-1 text-xs"
                  >
                    상위 글 바로 수정
                  </AdminActionButton>
                )}
              </div>
            </div>
          </AdminDisclosureSection>
        </>
      )}
    </div>
  );
}
