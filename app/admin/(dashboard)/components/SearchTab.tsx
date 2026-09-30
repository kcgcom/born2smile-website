"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListTree } from "lucide-react";
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

const SITEMAP_STATUS_COPY: Record<
  SearchConsoleData["sitemap"]["status"],
  { label: string; className: string }
> = {
  healthy: { label: "정상", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  pending: { label: "처리 중", className: "border-blue-200 bg-blue-50 text-blue-700" },
  warning: { label: "경고", className: "border-amber-200 bg-amber-50 text-amber-800" },
  error: { label: "오류", className: "border-red-200 bg-red-50 text-red-700" },
  unavailable: { label: "조회 불가", className: "border-slate-200 bg-slate-50 text-slate-600" },
};

function formatSitemapDate(value: string | null): string {
  if (!value) return "기록 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

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
    `/api/admin/search-console?period=${period}&includeClusters=true`,
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
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            <span aria-hidden="true">ⓘ</span> 데이터 기준: {data.dataAsOf} (2~3일 지연)
          </span>
        )}
        {data?.siteUrl && (
          <details className="relative text-xs text-[var(--muted)]">
            <summary className="cursor-pointer rounded-full bg-[var(--background)] px-2.5 py-1 font-medium">
              데이터 정보
            </summary>
            <div className="absolute left-0 top-8 z-20 w-80 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-lg">
              <p className="break-all">속성: {data.siteUrl}</p>
              {data.configuredSiteUrl !== data.siteUrl && <p className="mt-1">설정 속성에서 자동 전환됨</p>}
              <p className="mt-2">Search Console 데이터는 트래픽 데이터보다 2~3일 늦을 수 있습니다.</p>
            </div>
          </details>
        )}
      </div>

      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {!loading && !error && data && (
        <>
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

          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <ListTree className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Sitemap</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SITEMAP_STATUS_COPY[data.sitemap.status].className}`}>
                    {SITEMAP_STATUS_COPY[data.sitemap.status].label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {data.sitemap.submittedUrlCount == null ? "URL 수 확인 불가" : `${data.sitemap.submittedUrlCount.toLocaleString("ko-KR")}개`}
                  {" · "}마지막 다운로드 {formatSitemapDate(data.sitemap.lastDownloaded)}
                  {" · "}경고 {data.sitemap.warnings} · 오류 {data.sitemap.errors}
                </p>
              </div>
            </div>
            <details className="shrink-0 text-xs text-[var(--muted)]">
              <summary className="cursor-pointer font-medium hover:text-[var(--foreground)]">상세</summary>
              <div className="mt-2 space-y-1 rounded-xl bg-[var(--background)] p-3 lg:w-96">
                <p className="break-all">{data.sitemap.path}</p>
                <p>마지막 제출 {formatSitemapDate(data.sitemap.lastSubmitted)}</p>
                <p>상태 확인 {formatSitemapDate(data.sitemap.checkedAt)}</p>
              </div>
            </details>
          </div>

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <AdminPill tone="white">일반 페이지 검색 성과</AdminPill>
                <AdminPill tone="white">Search Console</AdminPill>
              </div>
              <h3 className="mt-3 text-base font-bold text-[var(--foreground)]">
                홈페이지와 진료 페이지의 검색 성과입니다.
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                블로그를 제외한 주요 페이지와 전체 사이트 유입 키워드를 확인합니다.
              </p>
            </div>

            <div className="space-y-5">
              <AdminDisclosureSection
                title="일반 페이지별 검색 성과"
                description="홈페이지와 진료 페이지 성과를 비교합니다."
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
