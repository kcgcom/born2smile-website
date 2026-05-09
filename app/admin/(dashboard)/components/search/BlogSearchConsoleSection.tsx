"use client";

import { useMemo, useState } from "react";
import { FilePenLine, Search } from "lucide-react";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { DataTable } from "../DataTable";
import { MetricCard } from "../MetricCard";
import {
  KeywordBarChart,
  PageQueryDrilldown,
  QueryPageDrilldown,
  formatCtr,
  getEditableBlogSlug,
  useSearchTableSort,
  type SearchConsoleData,
} from "./shared";

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

  const pageSort = useSearchTableSort(data.blogPages);
  const queryRows = useMemo<BlogQueryRow[]>(() => {
    return Object.entries(data.blogQueryTopPages)
      .map(([query, pages]) => {
        const topPage = pages[0];
        return {
          query,
          page: topPage?.page ?? "",
          impressions: topPage?.impressions ?? 0,
          clicks: topPage?.clicks ?? 0,
          ctr: topPage?.ctr ?? 0,
          position: topPage?.position ?? 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);
  }, [data.blogQueryTopPages]);
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
  const topBlogQuery = queryRows[0] ?? null;
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
              전체 사이트 성과와 섞지 않고, 블로그 글과 블로그 유입 쿼리만 분리해서 확인합니다.
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
          <h4 className="text-sm font-semibold text-[var(--foreground)]">상위 블로그 유입 쿼리</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            블로그를 찾게 만든 검색어만 따로 확인합니다.
          </p>
          {queryRows.length > 0 ? (
            <div className="mt-4">
              <KeywordBarChart data={queryRows} />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">
              블로그 유입 쿼리 데이터가 아직 없습니다.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
          <h4 className="text-sm font-semibold text-[var(--foreground)]">블로그 검색 요약</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            페이지와 쿼리 둘 다 블로그 전용으로 묶었습니다.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-4 py-3">
              <dt className="text-[var(--muted)]">검색에 잡힌 블로그 글</dt>
              <dd className="font-semibold text-[var(--foreground)]">{data.blogPages.length}개</dd>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-xl bg-white/80 px-4 py-3">
              <dt className="text-[var(--muted)]">확인된 블로그 쿼리</dt>
              <dd className="font-semibold text-[var(--foreground)]">{queryRows.length}개</dd>
            </div>
            <div className="rounded-xl bg-white/80 px-4 py-3">
              <dt className="text-[var(--muted)]">대표 검색어</dt>
              <dd className="mt-1 font-semibold text-[var(--foreground)]">
                {topBlogQuery?.query ?? "데이터 없음"}
              </dd>
              {topBlogQuery && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  연결 글 {getBlogPageLabel(topBlogQuery.page)} · CTR {formatCtr(topBlogQuery.ctr)} · 순위 {topBlogQuery.position}
                </p>
              )}
            </div>
          </dl>
        </div>
      </div>

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
        title="블로그 유입 쿼리"
        description="블로그 글과 연결된 검색어를 블로그 관점으로만 확인합니다."
        countLabel={`${queryRows.length}개`}
        collapsedMessage="블로그 검색어와 연결 페이지를 펼쳐서 봅니다."
      >
        <DataTable
          columns={[
            {
              key: "query",
              label: "검색어",
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
          emptyMessage="블로그 유입 쿼리 데이터가 없습니다"
          sortKey={querySort.sortKey}
          sortDirection={querySort.sortDirection}
          onSort={querySort.handleSort}
        />
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
    </section>
  );
}
