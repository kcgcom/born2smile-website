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
  formatCtr,
  getEditableBlogSlug,
} from "../search/search-utils";
import { PageQueryDrilldown, QueryPageDrilldown } from "../search/search-components";
import type { SearchConsoleData } from "../search/search-types";
import { ApiSourceBadge } from "../insight/ApiSourceBadge";
import { CATEGORY_HEX } from "./blog-helpers";
import type { AdminBlogPost } from "./blog-helpers";

type BlogGA4Data = { blogPostStats: { path: string; pageViews: number; avgDuration: number }[]; dataAsOf: string };

type CategoryData = { category: string; count: number };
const EMPTY_POSTS: AdminBlogPost[] = [];

function formatDurationShort(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

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

  type SortKey = "impressions" | "clicks" | "ctr" | "position" | "pageViews" | "avgDuration";
  const [postsSortKey, setPostsSortKey] = useState<SortKey>("impressions");
  const [postsSortDir, setPostsSortDir] = useState<"asc" | "desc">("desc");
  const [queriesSortKey, setQueriesSortKey] = useState<SortKey>("impressions");
  const [queriesSortDir, setQueriesSortDir] = useState<"asc" | "desc">("desc");

  function makeHandleSort<K extends string>(
    current: K,
    currentDir: "asc" | "desc",
    setKey: (k: K) => void,
    setDir: (d: "asc" | "desc") => void,
  ) {
    return (key: string) => {
      const k = key as K;
      if (k === current) {
        setDir(currentDir === "desc" ? "asc" : "desc");
      } else {
        setKey(k);
        setDir(k === "position" ? "asc" : "desc");
      }
    };
  }

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
    if (!searchData?.blogQueryTopPages) return [];
    // blogQueryTopPages: query → [{page, impressions, ...}]
    // Flatten to one row per query (pick the page with highest impressions as representative)
    return Object.entries(searchData.blogQueryTopPages)
      .map(([query, pages]) => {
        const top = pages[0];
        return {
          query,
          page: top?.page ?? "",
          impressions: top?.impressions ?? 0,
          clicks: top?.clicks ?? 0,
          ctr: top?.ctr ?? 0,
          position: top?.position ?? 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);
  }, [searchData]);

  const topVisitedPosts = useMemo(() => {
    return (blogGA4Data?.blogPostStats ?? [])
      .map((item) => {
        const slug = getEditableBlogSlug(item.path);
        return {
          ...item,
          slug,
          title: slug ? slugToTitleMap.get(slug) : undefined,
          searchMetrics: searchData?.blogPages.find((page) => page.page === item.path) ?? null,
        };
      })
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 12);
  }, [blogGA4Data, slugToTitleMap, searchData?.blogPages]);

  const visitSummary = useMemo(() => {
    const rows = blogGA4Data?.blogPostStats ?? [];
    if (rows.length === 0) return { pageViews: 0, avgDuration: 0, trackedPosts: 0 };
    const pageViews = rows.reduce((sum, row) => sum + row.pageViews, 0);
    const weightedDuration = rows.reduce((sum, row) => sum + row.avgDuration * row.pageViews, 0);
    return {
      pageViews,
      avgDuration: pageViews > 0 ? Math.round(weightedDuration / pageViews) : 0,
      trackedPosts: rows.length,
    };
  }, [blogGA4Data]);

  const combinedInsights = useMemo(() => {
    const searchStrongVisitWeak = topBlogSearchPages
      .map((row) => ({
        ...row,
        ga4: ga4StatsMap.get(row.page),
        slug: getEditableBlogSlug(row.page),
      }))
      .filter((row) => row.impressions >= 100 && (row.ga4?.pageViews ?? 0) < 30)
      .slice(0, 3);

    const visitStrongSearchWeak = topVisitedPosts
      .filter((row) => (row.searchMetrics?.impressions ?? 0) < 100)
      .slice(0, 3);

    const strongCombined = topVisitedPosts
      .filter((row) => (row.searchMetrics?.clicks ?? 0) >= 10 && row.pageViews >= 50)
      .slice(0, 3);

    return {
      searchStrongVisitWeak,
      visitStrongSearchWeak,
      strongCombined,
    };
  }, [topBlogSearchPages, ga4StatsMap, topVisitedPosts]);

  const selectedBlogPageQueries = selectedBlogPage
    ? searchData?.pageTopQueries[selectedBlogPage] ?? []
    : [];
  const selectedBlogPageMetrics = selectedBlogPage
    ? searchData?.blogPages.find((item) => item.page === selectedBlogPage)
    : undefined;
  const selectedBlogQueryPages = selectedBlogQuery
    ? searchData?.blogQueryTopPages[selectedBlogQuery] ?? []
    : [];

  const sortedBlogSearchPages = useMemo(() => {
    const rows = [...topBlogSearchPages];
    rows.sort((a, b) => {
      let av: number, bv: number;
      if (postsSortKey === "pageViews") {
        av = ga4StatsMap.get(a.page)?.pageViews ?? -1;
        bv = ga4StatsMap.get(b.page)?.pageViews ?? -1;
      } else if (postsSortKey === "avgDuration") {
        av = ga4StatsMap.get(a.page)?.avgDuration ?? -1;
        bv = ga4StatsMap.get(b.page)?.avgDuration ?? -1;
      } else {
        av = a[postsSortKey as keyof typeof a] as number;
        bv = b[postsSortKey as keyof typeof b] as number;
      }
      return postsSortDir === "desc" ? bv - av : av - bv;
    });
    return rows;
  }, [topBlogSearchPages, postsSortKey, postsSortDir, ga4StatsMap]);

  const sortedBlogSearchQueries = useMemo(() => {
    const rows = [...topBlogSearchQueries];
    rows.sort((a, b) => {
      let av: number, bv: number;
      if (queriesSortKey === "pageViews") {
        av = ga4StatsMap.get(a.page)?.pageViews ?? -1;
        bv = ga4StatsMap.get(b.page)?.pageViews ?? -1;
      } else if (queriesSortKey === "avgDuration") {
        av = ga4StatsMap.get(a.page)?.avgDuration ?? -1;
        bv = ga4StatsMap.get(b.page)?.avgDuration ?? -1;
      } else {
        av = a[queriesSortKey as keyof typeof a] as number;
        bv = b[queriesSortKey as keyof typeof b] as number;
      }
      return queriesSortDir === "desc" ? bv - av : av - bv;
    });
    return rows;
  }, [topBlogSearchQueries, queriesSortKey, queriesSortDir, ga4StatsMap]);

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
        {postsLoading && (
          <div className="flex items-center gap-2 py-4 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        )}
        {postsError && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {postsError}
          </div>
        )}
        {!postsLoading && !postsError && (
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
        )}
      </section>

      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">콘텐츠 통계</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              검색 성과, 방문 성과, 그리고 두 데이터를 함께 해석한 인사이트를 나눠서 봅니다.
            </p>
          </div>
          <PeriodSelector
            periods={[
              { value: "28d", label: "1개월" },
              { value: "90d", label: "3개월" },
              { value: "180d", label: "6개월" },
            ]}
            selected={searchPeriod}
            onChange={handleSearchPeriodChange}
          />
        </div>

        {searchLoading && <AdminLoadingSkeleton variant="metrics" />}
        {searchError && <AdminErrorState message={searchError} onRetry={refetchSearch} />}

        {!searchLoading && !searchError && (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">검색 성과</h4>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    검색 결과에서 얼마나 보이고 클릭됐는지 봅니다.
                  </p>
                </div>
                <ApiSourceBadge sources={["searchConsole"]} />
                {searchData?.dataAsOf && (
                  <span className="inline-flex rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                    Search Console 기준: {searchData.dataAsOf}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCard label="블로그 노출" value={blogSearchSummary.impressions.toLocaleString("ko-KR")} />
                  <MetricCard label="블로그 클릭" value={blogSearchSummary.clicks.toLocaleString("ko-KR")} />
                  <MetricCard label="블로그 CTR" value={`${blogSearchSummary.ctr}%`} />
                  <MetricCard label="평균 순위" value={blogSearchSummary.position} />
                </div>

                <div>
              {/* 탭 전환 */}
              <div className="mb-4 flex w-fit gap-1 rounded-xl bg-slate-100/80 p-1">
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
                  {/* 모바일 카드 */}
                  <div className="sm:hidden space-y-2">
                    {topBlogSearchPages.length === 0 && (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">블로그 검색 성과 데이터가 아직 없습니다</p>
                    )}
                    {topBlogSearchPages.map((item) => {
                      const slug = getEditableBlogSlug(item.page);
                      const title = slug ? slugToTitleMap.get(slug) : undefined;
                      return (
                        <div key={item.page} className="rounded-xl bg-white/90 px-4 py-3 shadow-sm">
                          <a href={item.page} target="_blank" rel="noopener noreferrer" className="mb-1.5 block font-medium text-[var(--foreground)] text-sm leading-snug hover:text-[var(--color-primary)] hover:underline">{title ?? slug ?? item.page}</a>
                          {slug && (
                            <div className="mb-2.5">
                              <button type="button" onClick={() => setSelectedBlogPage((c) => c === item.page ? null : item.page)} className="text-xs font-medium text-[var(--color-primary)]">대표 쿼리 보기</button>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                            <div><span className="text-[var(--muted)]">노출</span><br /><span className="font-semibold">{item.impressions.toLocaleString("ko-KR")}</span></div>
                            <div><span className="text-[var(--muted)]">클릭</span><br /><span className="font-semibold">{item.clicks.toLocaleString("ko-KR")}</span></div>
                            <div><span className="text-[var(--muted)]">CTR</span><br /><span className="font-semibold">{formatCtr(item.ctr)}</span></div>
                            <div><span className="text-[var(--muted)]">순위</span><br /><span className="font-semibold">{item.position}</span></div>
                            <div><span className="text-[var(--muted)]">페이지</span><br /><span className="font-semibold text-slate-700">{title ?? slug ?? "—"}</span></div>
                            <div><span className="text-[var(--muted)]">대표 쿼리</span><br /><span className="font-semibold text-[var(--color-primary)]">{slug ? "확인 가능" : "—"}</span></div>
                          </div>
                          {selectedBlogPage === item.page && (
                            <div className="mt-3">
                              <PageQueryDrilldown
                                page={item.page}
                                queries={selectedBlogPageQueries}
                                metrics={selectedBlogPageMetrics}
                                onClose={() => setSelectedBlogPage(null)}
                                  />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* 데스크탑 테이블 */}
                  <div className="hidden sm:block">
                    <DataTable
                      keyField="page"
                      rows={sortedBlogSearchPages}
                      sortKey={postsSortKey}
                      sortDirection={postsSortDir}
                      onSort={makeHandleSort(postsSortKey, postsSortDir, setPostsSortKey, setPostsSortDir)}
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
                                <a href={page} target="_blank" rel="noopener noreferrer" className="block truncate font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline" title={page}>{title ?? slug ?? page}</a>
                                {slug && (
                                  <div className="mt-1">
                                    <button type="button" onClick={() => setSelectedBlogPage((c) => c === page ? null : page)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">대표 쿼리 보기</button>
                                  </div>
                                )}
                              </div>
                            );
                          },
                        },
                        { key: "impressions", label: "노출", align: "right", sortable: true },
                        { key: "clicks", label: "클릭", align: "right", sortable: true },
                        { key: "ctr", label: "CTR", align: "right", sortable: true, render: (row) => formatCtr((row as SearchConsoleData["blogPages"][number]).ctr) },
                        { key: "position", label: "순위", align: "right", sortable: true },
                      ]}
                      emptyMessage="블로그 검색 성과 데이터가 아직 없습니다"
                      expandedRowKey={selectedBlogPage ?? undefined}
                      renderExpandedRow={(row) => {
                        const page = (row as SearchConsoleData["blogPages"][number]).page;
                        return (
                          <PageQueryDrilldown
                            page={page}
                            queries={selectedBlogPageQueries}
                            metrics={selectedBlogPageMetrics}
                            onClose={() => setSelectedBlogPage(null)}
                          />
                        );
                      }}
                    />
                  </div>
                </>
              )}

              {tableTab === "queries" && (
                <>
                  {/* 모바일 카드 */}
                  <div className="sm:hidden space-y-2">
                    {topBlogSearchQueries.length === 0 && (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">대표 유입 쿼리 데이터가 아직 없습니다</p>
                    )}
                    {topBlogSearchQueries.map((item) => {
                      return (
                        <div key={item.query} className="rounded-xl bg-white/90 px-4 py-3 shadow-sm">
                          <p className="mb-1.5 font-medium text-[var(--foreground)] text-sm">{item.query}</p>
                          <div className="mb-2.5 flex gap-3">
                            <button type="button" onClick={() => setSelectedBlogQuery((c) => c === item.query ? null : item.query)} className="text-xs font-medium text-[var(--color-primary)]">연결 페이지 보기</button>
                            <p className="truncate text-xs text-[var(--muted)]">{item.page}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                            <div><span className="text-[var(--muted)]">노출</span><br /><span className="font-semibold">{item.impressions.toLocaleString("ko-KR")}</span></div>
                            <div><span className="text-[var(--muted)]">클릭</span><br /><span className="font-semibold">{item.clicks.toLocaleString("ko-KR")}</span></div>
                            <div><span className="text-[var(--muted)]">CTR</span><br /><span className="font-semibold">{formatCtr(item.ctr)}</span></div>
                            <div><span className="text-[var(--muted)]">순위</span><br /><span className="font-semibold">{item.position}</span></div>
                            <div><span className="text-[var(--muted)]">대표 페이지</span><br /><span className="font-semibold text-slate-700">{item.page || "—"}</span></div>
                            <div><span className="text-[var(--muted)]">연결 페이지</span><br /><span className="font-semibold text-[var(--color-primary)]">확인 가능</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 데스크탑 테이블 */}
                  <div className="hidden sm:block">
                    <DataTable
                      keyField="query"
                      rows={sortedBlogSearchQueries}
                      sortKey={queriesSortKey}
                      sortDirection={queriesSortDir}
                      onSort={makeHandleSort(queriesSortKey, queriesSortDir, setQueriesSortKey, setQueriesSortDir)}
                      columns={[
                        {
                          key: "query",
                          label: "쿼리",
                          render: (row) => (
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--foreground)]" title={(row as typeof topBlogSearchQueries[number]).query}>{(row as typeof topBlogSearchQueries[number]).query}</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <button type="button" onClick={() => setSelectedBlogQuery((c) => c === (row as typeof topBlogSearchQueries[number]).query ? null : (row as typeof topBlogSearchQueries[number]).query)} className="text-xs font-medium text-[var(--color-primary)] hover:underline">연결 페이지 보기</button>
                                <p className="truncate text-xs text-[var(--muted)]">{(row as typeof topBlogSearchQueries[number]).page}</p>
                              </div>
                            </div>
                          ),
                        },
                        { key: "impressions", label: "노출", align: "right", sortable: true },
                        { key: "clicks", label: "클릭", align: "right", sortable: true },
                        { key: "ctr", label: "CTR", align: "right", sortable: true, render: (row) => formatCtr((row as typeof topBlogSearchQueries[number]).ctr) },
                        { key: "position", label: "순위", align: "right", sortable: true },
                      ]}
                      emptyMessage="대표 유입 쿼리 데이터가 아직 없습니다"
                    />
                  </div>
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

              <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">방문 성과</h4>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    실제로 들어온 뒤 얼마나 읽히는지 봅니다.
                  </p>
                </div>
                <ApiSourceBadge sources={["ga4"]} />
                {blogGA4Data?.dataAsOf && (
                  <span className="inline-flex rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                    Analytics 기준: {blogGA4Data.dataAsOf}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricCard label="블로그 페이지뷰" value={visitSummary.pageViews.toLocaleString("ko-KR")} />
                  <MetricCard label="평균 체류" value={formatDurationShort(visitSummary.avgDuration)} />
                  <MetricCard label="추적 포스트" value={visitSummary.trackedPosts.toLocaleString("ko-KR")} />
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-semibold text-[var(--foreground)]">많이 본 글</h5>
                  <div className="space-y-2">
                    {topVisitedPosts.length > 0 ? topVisitedPosts.slice(0, 8).map((item) => (
                      <div key={item.path} className="rounded-xl border border-[var(--border)] bg-white px-4 py-3">
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                        >
                          {item.title ?? item.slug ?? item.path}
                        </a>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[var(--muted)]">페이지뷰</span><br />
                            <span className="font-semibold text-blue-600">{item.pageViews.toLocaleString("ko-KR")}</span>
                          </div>
                          <div>
                            <span className="text-[var(--muted)]">체류시간</span><br />
                            <span className="font-semibold text-emerald-600">{formatDurationShort(item.avgDuration)}</span>
                          </div>
                          <div>
                            <span className="text-[var(--muted)]">검색 클릭</span><br />
                            <span className="font-semibold text-slate-700">{item.searchMetrics ? item.searchMetrics.clicks.toLocaleString("ko-KR") : "—"}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                        방문 성과 데이터가 아직 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">핵심 인사이트</h4>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  검색 성과와 방문 성과를 함께 봤을 때 바로 행동으로 옮길 포인트입니다.
                </p>
              </div>
              <ApiSourceBadge sources={["searchConsole", "ga4"]} />
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <InsightListCard
                  title="검색은 보이는데 방문 반응 약한 글"
                  items={combinedInsights.searchStrongVisitWeak.map((item) => ({
                    key: item.page,
                    title: (item.slug ? slugToTitleMap.get(item.slug) : null) ?? item.slug ?? item.page,
                    meta: `노출 ${item.impressions.toLocaleString("ko-KR")} · 페이지뷰 ${(item.ga4?.pageViews ?? 0).toLocaleString("ko-KR")}`,
                  }))}
                  emptyMessage="지금은 뚜렷한 후보가 없습니다."
                />
                <InsightListCard
                  title="방문은 좋은데 검색 노출 약한 글"
                  items={combinedInsights.visitStrongSearchWeak.map((item) => ({
                    key: item.path,
                    title: item.title ?? item.slug ?? item.path,
                    meta: `페이지뷰 ${item.pageViews.toLocaleString("ko-KR")} · 노출 ${(item.searchMetrics?.impressions ?? 0).toLocaleString("ko-KR")}`,
                  }))}
                  emptyMessage="지금은 뚜렷한 후보가 없습니다."
                />
                <InsightListCard
                  title="검색과 방문이 함께 강한 글"
                  items={combinedInsights.strongCombined.map((item) => ({
                    key: item.path,
                    title: item.title ?? item.slug ?? item.path,
                    meta: `클릭 ${(item.searchMetrics?.clicks ?? 0).toLocaleString("ko-KR")} · 페이지뷰 ${item.pageViews.toLocaleString("ko-KR")}`,
                  }))}
                  emptyMessage="아직 충분한 결합 데이터가 없습니다."
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function InsightListCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{ key: string; title: string; meta: string }>;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface)] p-4">
      <h5 className="text-sm font-semibold text-[var(--foreground)]">{title}</h5>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item) => (
          <div key={item.key} className="rounded-xl border border-[var(--border)] bg-white px-3 py-3">
            <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.meta}</p>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-5 text-center text-sm text-[var(--muted)]">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
