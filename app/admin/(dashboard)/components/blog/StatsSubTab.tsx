"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getCategoryLabel } from "@/lib/blog/category-slugs";
import { getTodayKST } from "@/lib/date";
import { useAdminApi } from "../useAdminApi";
import { MetricCard } from "../MetricCard";
import { DataTable } from "../DataTable";
import { PeriodSelector } from "../PeriodSelector";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import {
  PageQueryDrilldown,
  QueryPageDrilldown,
  formatCtr,
  getEditableBlogSlug,
} from "../search/shared";
import type { SearchConsoleData } from "../search/shared";
import { ApiSourceBadge } from "../insight/ApiSourceBadge";
import { CATEGORY_HEX } from "./blog-helpers";
import type { AdminBlogPost } from "./blog-helpers";

type BlogGA4Data = { blogPostStats: { path: string; pageViews: number; avgDuration: number }[]; dataAsOf: string };

type CategoryData = { category: string; count: number };
const EMPTY_POSTS: AdminBlogPost[] = [];

const CategoryPieChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data }: { data: CategoryData[] }) {
        const pieData = data.map((d) => ({
          name: d.category,
          value: d.count,
          fill: CATEGORY_HEX[d.category] ?? "#6B7280",
        }));
        return (
          <mod.ResponsiveContainer width="100%" height={260}>
            <mod.PieChart>
              <mod.Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(props) => {
                  const { cx: cxVal, cy: cyVal, midAngle, innerRadius: ir, outerRadius: or, percent } =
                    props as unknown as { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number };
                  const radian = Math.PI / 180;
                  const radius = ir + (or - ir) * 0.5;
                  const x = cxVal + radius * Math.cos(-midAngle * radian);
                  const y = cyVal + radius * Math.sin(-midAngle * radian);
                  if (percent < 0.05) return null;
                  return (
                    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                      {(percent * 100).toFixed(0)}%
                    </text>
                  );
                }}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <mod.Cell key={index} fill={entry.fill} />
                ))}
              </mod.Pie>
              <mod.Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [`${value}편`, name]) as any}
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
            </mod.PieChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

export function StatsSubTab() {
  const today = getTodayKST();
  const router = useRouter();

  const [searchPeriod, setSearchPeriod] = useState<"28d" | "90d" | "180d">("28d");
  const [tableTab, setTableTab] = useState<"posts" | "queries">("posts");
  const [selectedBlogPage, setSelectedBlogPage] = useState<string | null>(null);
  const [selectedBlogQuery, setSelectedBlogQuery] = useState<string | null>(null);

  const { data: postsData, loading: postsLoading, error: postsError } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const posts = postsData ?? EMPTY_POSTS;

  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useAdminApi<SearchConsoleData>(`/api/admin/search-console?period=${searchPeriod}`);

  const { data: blogGA4Data } = useAdminApi<BlogGA4Data>(`/api/admin/blog-analytics?period=${searchPeriod}`);

  const byCategoryAll = useMemo(
    () =>
      BLOG_CATEGORY_SLUGS.map((cat) => ({
        category: getCategoryLabel(cat),
        count: posts.filter((p) => p.category === cat).length,
      })),
    [posts],
  );

  const byCategoryPublished = useMemo(() => {
    const published = posts.filter((p) => p.published && p.date <= today);
    return BLOG_CATEGORY_SLUGS.map((cat) => ({
      category: getCategoryLabel(cat),
      count: published.filter((p) => p.category === cat).length,
    }));
  }, [posts, today]);

  const slugToTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const post of posts) map.set(post.slug, post.title);
    return map;
  }, [posts]);

  const topBlogSearchPages = useMemo(
    () => searchData?.blogPages ?? [],
    [searchData?.blogPages],
  );

  const ga4StatsMap = useMemo(() => {
    const map = new Map<string, { pageViews: number; avgDuration: number }>();
    for (const item of blogGA4Data?.blogPostStats ?? []) {
      map.set(item.path, { pageViews: item.pageViews, avgDuration: item.avgDuration });
    }
    return map;
  }, [blogGA4Data]);

  const topBlogSearchQueries = useMemo(() => {
    if (!searchData) return [];
    const rows = topBlogSearchPages.flatMap((pageRow) =>
      (searchData.pageTopQueries[pageRow.page] ?? []).map((queryRow) => ({
        ...queryRow,
        page: pageRow.page,
      })),
    );
    const deduped = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const existing = deduped.get(row.query);
      if (!existing || row.impressions > existing.impressions) {
        deduped.set(row.query, row);
      }
    }
    return Array.from(deduped.values())
      .sort((a, b) => b.impressions - a.impressions);
  }, [searchData, topBlogSearchPages]);

  const selectedBlogPageQueries = selectedBlogPage
    ? searchData?.pageTopQueries[selectedBlogPage] ?? []
    : [];
  const selectedBlogPageMetrics = selectedBlogPage
    ? searchData?.blogPages.find((item) => item.page === selectedBlogPage)
    : undefined;
  const selectedBlogQueryPages = selectedBlogQuery
    ? searchData?.queryTopPages[selectedBlogQuery] ?? []
    : [];

  const blogSearchSummary = useMemo(() => {
    const rows = searchData?.blogPages ?? [];
    if (rows.length === 0) return { impressions: 0, clicks: 0, ctr: 0, position: 0 };
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
    const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
    const weightedPosition = rows.reduce((sum, row) => sum + row.position * row.impressions, 0);
    return {
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      position: impressions > 0 ? Math.round((weightedPosition / impressions) * 10) / 10 : 0,
    };
  }, [searchData?.blogPages]);

  const handleSearchPeriodChange = (value: string) => {
    setSearchPeriod(value as "28d" | "90d" | "180d");
    setSelectedBlogPage(null);
    setSelectedBlogQuery(null);
  };

  if (postsLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        통계를 불러오는 중...
      </div>
    );
  }

  if (postsError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        {postsError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-center text-sm font-medium text-[var(--muted)]">전체 ({posts.length}편)</p>
            <CategoryPieChart data={byCategoryAll} />
          </div>
          <div>
            <p className="mb-2 text-center text-sm font-medium text-[var(--muted)]">
              발행 ({posts.filter((p) => p.published && p.date <= today).length}편)
            </p>
            <CategoryPieChart data={byCategoryPublished} />
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-2 text-base font-bold text-[var(--foreground)]">블로그 검색 성과</h3>
        <ApiSourceBadge sources={["searchConsole", "ga4"]} />

        {searchLoading && <AdminLoadingSkeleton variant="metrics" />}
        {searchError && <AdminErrorState message={searchError} onRetry={refetchSearch} />}

        {!searchLoading && !searchError && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <PeriodSelector
                periods={[
                  { value: "28d", label: "1개월" },
                  { value: "90d", label: "3개월" },
                  { value: "180d", label: "6개월" },
                ]}
                selected={searchPeriod}
                onChange={handleSearchPeriodChange}
              />
              {searchData?.dataAsOf && (
                <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                  데이터 기준: {searchData.dataAsOf}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="블로그 노출" value={blogSearchSummary.impressions.toLocaleString("ko-KR")} />
              <MetricCard label="블로그 클릭" value={blogSearchSummary.clicks.toLocaleString("ko-KR")} />
              <MetricCard label="블로그 CTR" value={`${blogSearchSummary.ctr}%`} />
              <MetricCard label="평균 순위" value={blogSearchSummary.position} />
            </div>

            <div>
              {/* 탭 전환 */}
              <div className="mb-4 flex gap-1 rounded-xl bg-slate-100/80 p-1 w-fit">
                {(["posts", "queries"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setTableTab(tab);
                      setSelectedBlogPage(null);
                      setSelectedBlogQuery(null);
                    }}
                    className={`rounded-lg px-4 py-1.5 text-sm transition-all ${
                      tableTab === tab
                        ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
                        : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {tab === "posts" ? "포스트별" : "쿼리별"}
                  </button>
                ))}
              </div>

              {tableTab === "posts" && (
                <>
                  <DataTable
                    keyField="page"
                    rows={topBlogSearchPages}
                    columns={[
                      {
                        key: "page",
                        label: "포스트",
                        render: (row) => {
                          const page = (row as SearchConsoleData["blogPages"][number]).page;
                          const slug = getEditableBlogSlug(page);
                          const title = slug ? slugToTitleMap.get(slug) : undefined;
                          return (
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--foreground)]" title={page}>
                                {title ?? slug ?? page}
                              </p>
                              {slug && (
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBlogPage((current) => current === page ? null : page)}
                                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                                  >
                                    대표 쿼리 보기
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/admin/content/posts/${slug}`)}
                                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                                  >
                                    이 글 편집
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        },
                      },
                      { key: "impressions", label: "노출", align: "right" },
                      { key: "clicks", label: "클릭", align: "right" },
                      {
                        key: "ctr",
                        label: "CTR",
                        align: "right",
                        render: (row) => formatCtr((row as SearchConsoleData["blogPages"][number]).ctr),
                      },
                      { key: "position", label: "순위", align: "right" },
                      {
                        key: "pageViews",
                        label: "페이지뷰",
                        align: "right",
                        render: (row) => {
                          const ga4 = ga4StatsMap.get((row as SearchConsoleData["blogPages"][number]).page);
                          return ga4 ? (
                            <span className="font-medium text-blue-600">{ga4.pageViews.toLocaleString("ko-KR")}</span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          );
                        },
                      },
                      {
                        key: "avgDuration",
                        label: "체류시간",
                        align: "right",
                        render: (row) => {
                          const ga4 = ga4StatsMap.get((row as SearchConsoleData["blogPages"][number]).page);
                          if (!ga4) return <span className="text-[var(--muted)]">—</span>;
                          const m = Math.floor(ga4.avgDuration / 60);
                          const s = ga4.avgDuration % 60;
                          return (
                            <span className="font-medium text-emerald-600">
                              {m}:{String(s).padStart(2, "0")}
                            </span>
                          );
                        },
                      },
                    ]}
                    emptyMessage="블로그 검색 성과 데이터가 아직 없습니다"
                  />
                  {selectedBlogPage && (
                    <PageQueryDrilldown
                      page={selectedBlogPage}
                      queries={selectedBlogPageQueries}
                      metrics={selectedBlogPageMetrics}
                      onClose={() => setSelectedBlogPage(null)}
                      onEditBlog={() => {
                        const slug = getEditableBlogSlug(selectedBlogPage);
                        if (slug) router.push(`/admin/content/posts/${slug}`);
                      }}
                    />
                  )}
                </>
              )}

              {tableTab === "queries" && (
                <>
                  <DataTable
                    keyField="query"
                    rows={topBlogSearchQueries}
                    columns={[
                      {
                        key: "query",
                        label: "쿼리",
                        render: (row) => (
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--foreground)]" title={(row as typeof topBlogSearchQueries[number]).query}>
                              {(row as typeof topBlogSearchQueries[number]).query}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedBlogQuery((current) => (
                                  current === (row as typeof topBlogSearchQueries[number]).query
                                    ? null
                                    : (row as typeof topBlogSearchQueries[number]).query
                                ))}
                                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                              >
                                연결 페이지 보기
                              </button>
                              <p className="truncate text-xs text-[var(--muted)]" title={(row as typeof topBlogSearchQueries[number]).page}>
                                {(row as typeof topBlogSearchQueries[number]).page}
                              </p>
                            </div>
                          </div>
                        ),
                      },
                      { key: "impressions", label: "노출", align: "right" },
                      { key: "clicks", label: "클릭", align: "right" },
                      {
                        key: "ctr",
                        label: "CTR",
                        align: "right",
                        render: (row) => formatCtr((row as typeof topBlogSearchQueries[number]).ctr),
                      },
                      { key: "position", label: "순위", align: "right" },
                    ]}
                    emptyMessage="대표 유입 쿼리 데이터가 아직 없습니다"
                  />
                  {selectedBlogQuery && (
                    <QueryPageDrilldown
                      query={selectedBlogQuery}
                      pages={selectedBlogQueryPages}
                      onClose={() => setSelectedBlogQuery(null)}
                      onEditBlog={(slug) => router.push(`/admin/content/posts/${slug}`)}
                      onCreatePost={(category) => {
                        if (category) {
                          router.push(`/admin/content/posts/new?category=${encodeURIComponent(category)}`);
                          return;
                        }
                        router.push("/admin/content/posts/new");
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
