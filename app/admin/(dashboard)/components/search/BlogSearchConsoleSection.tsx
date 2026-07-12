"use client";

import { useMemo, useState } from "react";
import { FilePenLine, Search } from "lucide-react";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { DataTable } from "../DataTable";
import { MetricCard } from "../MetricCard";
import type { SearchConsoleData } from "./search-types";
import { formatCtr, getEditableBlogSlug } from "./search-utils";
import { useSearchTableSort } from "./search-hooks";
import { PageQueryDrilldown, QueryPageDrilldown } from "./search-components";
import { ClusteredKeywordTable } from "./ClusteredKeywordTable";

type BlogQueryRow = {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

type BlogSearchConsoleSectionProps = {
  data: SearchConsoleData;
  onEditBlog: (slug: string) => void;
  onCreatePost: (category?: string | null) => void;
};

function getBlogPageLabel(page: string) {
  const slug = getEditableBlogSlug(page);
  return slug ?? page;
}

export function BlogSearchConsoleSection({
  data,
  onEditBlog,
  onCreatePost,
}: BlogSearchConsoleSectionProps) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [clustered, setClustered] = useState(true);

  const pageSort = useSearchTableSort(data.blogPages);
  const queryRows = useMemo<BlogQueryRow[]>(() => {
    return Object.entries(data.blogQueryTopPages).map(([query, pages]) => {
      const topPage = pages[0];
      const metrics = data.blogQueryMetrics[query];
      return {
        query,
        page: topPage?.page ?? "",
        impressions: metrics?.impressions ?? 0,
        clicks: metrics?.clicks ?? 0,
        ctr: metrics?.ctr ?? 0,
        position: metrics?.position ?? 0,
      };
    });
  }, [data.blogQueryMetrics, data.blogQueryTopPages]);
  const querySort = useSearchTableSort(queryRows);

  const blogSummary = useMemo(() => {
    if (data.blogPages.length === 0) {
      return { impressions: 0, clicks: 0, ctr: 0, position: 0 };
    }

    const impressions = data.blogPages.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = data.blogPages.reduce((sum, row) => sum + row.clicks, 0);
    const weightedPosition = data.blogPages.reduce(
      (sum, row) => sum + row.position * row.impressions,
      0,
    );

    return {
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      position: impressions > 0 ? Math.round((weightedPosition / impressions) * 10) / 10 : 0,
    };
  }, [data.blogPages]);

  const topBlogPage = data.blogPages[0] ?? null;
  const selectedPageQueries = selectedPage ? data.pageTopQueries[selectedPage] ?? [] : [];
  const selectedPageMetrics = selectedPage
    ? data.blogPages.find((item) => item.page === selectedPage)
    : undefined;
  const selectedQueryPages = selectedQuery ? data.blogQueryTopPages[selectedQuery] ?? [] : [];

  return (
    <section className="space-y-4">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="white">블로그 관점</AdminPill>
              <AdminPill tone="white">Search Console 전용</AdminPill>
            </div>
            <h3 className="mt-3 text-lg font-bold text-[var(--foreground)]">
              블로그 글이 검색에서 어떻게 노출되고 클릭되는지 따로 봅니다.
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              전체 사이트 성과와 섞지 않고, 블로그 글과 블로그 유입 키워드만 분리해서 확인합니다.
            </p>
            {topBlogPage && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <span>대표 블로그 글</span>
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {getBlogPageLabel(topBlogPage.page)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  노출 {topBlogPage.impressions.toLocaleString("ko-KR")} · 클릭 {topBlogPage.clicks.toLocaleString("ko-KR")} · CTR {formatCtr(topBlogPage.ctr)} · 순위 {topBlogPage.position}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminActionButton
                    tone="dark"
                    onClick={() => setSelectedPage(topBlogPage.page)}
                    className="min-h-8 px-3 py-1 text-xs"
                  >
                    <Search className="h-3.5 w-3.5" />
                    대표 쿼리 보기
                  </AdminActionButton>
                  {getEditableBlogSlug(topBlogPage.page) && (
                    <AdminActionButton
                      tone="dark"
                      onClick={() => onEditBlog(getEditableBlogSlug(topBlogPage.page)!)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      이 글 수정
                    </AdminActionButton>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
            <MetricCard label="블로그 노출" value={blogSummary.impressions.toLocaleString("ko-KR")} />
            <MetricCard label="블로그 클릭" value={blogSummary.clicks.toLocaleString("ko-KR")} />
            <MetricCard label="블로그 CTR" value={`${blogSummary.ctr}%`} />
            <MetricCard label="평균 순위" value={blogSummary.position} />
          </div>
        </div>
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <AdminPill tone="white">블로그 검색 상세</AdminPill>
            <AdminPill tone="white">Search Console</AdminPill>
          </div>
          <h3 className="mt-3 text-base font-bold text-[var(--foreground)]">
            블로그 글과 유입 키워드를 개별적으로 확인합니다.
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            블로그 전용 페이지�� 키워드를 나눠서 검색 성과를 분석합니다.
          </p>
        </div>

        <div className="space-y-5">
      <AdminDisclosureSection
        title="블로그 페이지별 검색 성과"
        description="검색에서 노출되는 블로그 글 기준으로 봅니다."
        countLabel={`${data.blogPages.length}개`}
        defaultOpen={true}
        collapsedMessage="블로그 글별 노출과 클릭을 펼쳐서 봅니다."
      >
        <DataTable
          columns={[
            {
              key: "page",
              label: "블로그 글",
              align: "left",
              render: (row) => {
                const page = String((row as { page: string }).page);
                const isSelected = selectedPage === page;
                const slug = getEditableBlogSlug(page);
                return (
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPage((current) => (current === page ? null : page))}
                      className={`block max-w-[220px] truncate text-left sm:max-w-xs ${
                        isSelected
                          ? "font-medium text-[var(--color-primary)]"
                          : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                      }`}
                      title={page}
                    >
                      {slug ?? page}
                    </button>
                    <p className="mt-1 truncate text-xs text-[var(--muted)]">{page}</p>
                  </div>
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
              render: (row) => formatCtr((row as SearchConsoleData["blogPages"][number]).ctr),
            },
            { key: "position", label: "순위", align: "right", sortable: true },
          ]}
          rows={pageSort.sortedRows as unknown as Record<string, unknown>[]}
          keyField="page"
          emptyMessage="블로그 검색 성과 데이터가 없습니다"
          sortKey={pageSort.sortKey}
          sortDirection={pageSort.sortDirection}
          onSort={pageSort.handleSort}
        />
        {selectedPage && (
          <PageQueryDrilldown
            page={selectedPage}
            queries={selectedPageQueries}
            onClose={() => setSelectedPage(null)}
            metrics={selectedPageMetrics}
          />
        )}
      </AdminDisclosureSection>

      <AdminDisclosureSection
        title="블로그 유입 키워드"
        description="블로그 글과 연결된 키워드를 블로그 관점으로만 확인합니다."
        countLabel={`${queryRows.length}개`}
        collapsedMessage="블로그 키워드와 연결 페이지를 펼쳐서 봅니다."
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
            queries={queryRows}
            semanticClusters={data.blogSemanticClusters}
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
                  const representativePage = String((row as { page: string }).page);
                  const isSelected = selectedQuery === query;

                  return (
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedQuery((current) => (current === query ? null : query))}
                        className={`block max-w-[220px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={query}
                      >
                        {query}
                      </button>
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        연결 글 {getBlogPageLabel(representativePage)}
                      </p>
                    </div>
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
                render: (row) => formatCtr((row as BlogQueryRow).ctr),
              },
              { key: "position", label: "순위", align: "right", sortable: true },
            ]}
            rows={querySort.sortedRows as unknown as Record<string, unknown>[]}
            keyField="query"
            emptyMessage="블로그 유입 키워드 데이터가 없습니다"
            sortKey={querySort.sortKey}
            sortDirection={querySort.sortDirection}
            onSort={querySort.handleSort}
          />
        )}
        {selectedQuery && (
          <QueryPageDrilldown
            query={selectedQuery}
            pages={selectedQueryPages}
            onClose={() => setSelectedQuery(null)}
            onEditBlog={onEditBlog}
            onCreatePost={onCreatePost}
          />
        )}
      </AdminDisclosureSection>
        </div>
      </AdminSurface>
    </section>
  );
}
