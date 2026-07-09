"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isBlogCategorySlug } from "@/lib/blog/category-slugs";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { BlogSearchConsoleSection } from "./search/BlogSearchConsoleSection";
import type { SearchConsoleData } from "./search/search-types";
import { formatCtr, PERIODS } from "./search/search-utils";
import { useSearchTableSort } from "./search/search-hooks";
import { PageQueryDrilldown, QueryPageDrilldown } from "./search/search-components";
import { ClusteredKeywordTable } from "./search/ClusteredKeywordTable";

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function SearchTab() {
  const router = useRouter();
  const [period, setPeriod] = useState<"28d" | "90d" | "180d">("28d");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [selectedTopPage, setSelectedTopPage] = useState<string | null>(null);
  const [clustered, setClustered] = useState(true);

  const { data, loading, error, refetch } = useAdminApi<SearchConsoleData>(
    `/api/admin/search-console?period=${period}`,
  );

  const querySort = useSearchTableSort(data?.topQueries ?? []);
  const pageSort = useSearchTableSort(data?.topPages ?? []);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "28d" | "90d" | "180d");
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

  const selectedQueryPages = selectedQuery
    ? data?.queryTopPages[selectedQuery] ?? []
    : [];
  const selectedTopPageQueries = selectedTopPage
    ? data?.pageTopQueries[selectedTopPage] ?? []
    : [];
  const selectedTopPageMetrics = selectedTopPage
    ? data?.topPages.find((item) => item.page === selectedTopPage)
    : undefined;

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
            <span aria-hidden="true">🔎</span> 속성: {data.siteUrl}
            {data.configuredSiteUrl !== data.siteUrl ? " (자동 전환)" : ""}
          </span>
        )}
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            <span aria-hidden="true">ⓘ</span> 데이터 기준: {data.dataAsOf} (2~3일 지연)
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
                  <AdminPill tone="white">Search Console</AdminPill>
                </div>
                <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">검색에서 어떻게 보이고 클릭되는지 봅니다.</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  전체 사이트와 블로그를 나눠서 검색 노출, 클릭, 순위를 확인합니다.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-medium text-amber-700">전체 페이지</div>
                  <div className="mt-1 text-lg font-semibold text-amber-900">{data.topPages.length}개</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-medium text-blue-700">전체 검색 키워드</div>
                  <div className="mt-1 text-lg font-semibold text-blue-900">{data.topQueries.length}개</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-medium text-emerald-700">블로그 페이지</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-900">{data.blogPages.length}개</div>
                </div>
              </div>
            </div>
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

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminPill tone="white">전체 사이트 검색 성과</AdminPill>
                <AdminPill tone="white">Search Console</AdminPill>
              </div>
              <h3 className="mt-3 text-base font-bold text-[var(--foreground)]">
                홈페이지, 치료 페이지, 블로그를 모두 합친 검색 성과입니다.
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                전체 사이트 기준으로 어떤 키워드와 페이지가 실제 유입을 만들고 있는지 봅니다.
              </p>
            </div>

            <div className="space-y-5">
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
                title="상위 검색 키워드"
                description="키워드와 연결 페이지를 바로 확인합니다."
                countLabel={`${data.topQueries.length}개`}
                collapsedMessage="필요할 때만 펼쳐 봅니다."
                headerRight={
                  <button
                    type="button"
                    onClick={() => setClustered((v) => !v)}
                    aria-pressed={clustered}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      clustered
                        ? "bg-blue-100 text-blue-700"
                        : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {clustered ? "✓ 유사 키워드 묶기" : "유사 키워드 묶기"}
                  </button>
                }
              >
                {clustered ? (
                  <ClusteredKeywordTable
                    queries={data.topQueries}
                    semanticClusters={data.semanticClusters}
                    onSelectQuery={(q) =>
                      setSelectedQuery((current) => (current === q ? null : q))
                    }
                    selectedQuery={selectedQuery}
                  />
                ) : (
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
                )}
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
            </div>
          </AdminSurface>

          <BlogSearchConsoleSection
            data={data}
            onEditBlog={handleEditBlog}
            onCreatePost={handleCreateRelatedPost}
          />
        </>
      )}
    </div>
  );
}
