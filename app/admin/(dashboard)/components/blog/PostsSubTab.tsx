"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PublishPopup } from "@/components/admin/PublishPopup";
import type { PublishMode } from "@/components/admin/PublishPopup";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";
import type { BlogCategoryFilter } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { MetricCard } from "../MetricCard";
import { DataTable } from "../DataTable";
import { PeriodSelector } from "../PeriodSelector";
import { ContentScheduleManager } from "../ContentScheduleManager";
import type { AdminBlogPost, BlogLikesData, SortKey, StatusFilter } from "./blog-helpers";
import { AiWriteModal } from "./AiWriteModal";
import { BLOG_EDITOR_DRAFT_KEY } from "./blog-editor-draft";
import { ContentStatsPanel } from "./StatsSubTab";
import type { SearchConsoleData } from "../search/shared";
import {
  PageQueryDrilldown,
  QueryPageDrilldown,
  formatCtr,
  getEditableBlogSlug,
} from "../search/shared";
import {
  PostListItem,
  PostsFilterPanel,
  PostsHero,
  PostsSummaryCards,
  getBlogStats,
  getDraftRankMap,
  getFilteredPosts,
  getNextPublishDate,
} from "./posts-subtab-shared";

export function PostsSubTab() {
  const router = useRouter();
  const today = getTodayKST();

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const [searchPeriod, setSearchPeriod] = useState<"28d" | "90d" | "180d">("28d");
  const [selectedBlogPage, setSelectedBlogPage] = useState<string | null>(null);
  const [selectedBlogQuery, setSelectedBlogQuery] = useState<string | null>(null);
  const {
    data: searchData,
    loading: searchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useAdminApi<SearchConsoleData>(`/api/admin/search-console?period=${searchPeriod}`);
  const { data: likesData, loading: likesLoading, error: likesError } = useAdminApi<BlogLikesData>("/api/admin/blog-likes");
  const { data: scheduleData, loading: scheduleLoading } = useAdminApi<{ publishDays: number[] }>("/api/admin/site-config/schedule");
  const { mutate } = useAdminMutation();

  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<BlogCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("schedule");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingDateSlug, setEditingDateSlug] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [aiWriteOpen, setAiWriteOpen] = useState(false);

  const posts = useMemo(() => {
    const raw = postsData ?? [];
    if (publishedSlugs.size === 0) return raw;
    return raw.map((post) => (publishedSlugs.has(post.slug) ? { ...post, published: true } : post));
  }, [postsData, publishedSlugs]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusFilterChange = (next: StatusFilter) => {
    setStatusFilter(next);
    if (next === "draft") {
      setSortKey("recommended");
    } else if (sortKey === "recommended") {
      setSortKey("newest");
    }
  };

  const blogStats = useMemo(() => getBlogStats(posts, today), [posts, today]);
  const filteredPosts = useMemo(
    () => getFilteredPosts({
      posts,
      likesData,
      today,
      searchQuery: debouncedQuery,
      categoryFilter,
      statusFilter,
      sortKey,
    }),
    [posts, likesData, today, debouncedQuery, categoryFilter, statusFilter, sortKey],
  );
  const draftRankMap = useMemo(() => getDraftRankMap(filteredPosts, sortKey), [filteredPosts, sortKey]);
  const topBlogSearchPages = useMemo(
    () => (searchData?.blogPages ?? []).slice(0, 5),
    [searchData?.blogPages],
  );
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
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
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
    if (rows.length === 0) {
      return { impressions: 0, clicks: 0, ctr: 0, position: 0 };
    }

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

  const handleEdit = (post: AdminBlogPost) => {
    router.push(`/admin/content/posts/${post.slug}`);
  };

  const handleCreate = () => {
    window.sessionStorage.removeItem(BLOG_EDITOR_DRAFT_KEY);
    router.push("/admin/content/posts/new");
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("이 포스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleteError(null);
    const { error } = await mutate(`/api/admin/blog-posts/${slug}`, "DELETE");
    if (error) setDeleteError(error);
    else refetchPosts();
  };

  const handlePublishOpen = (slug: string) => {
    const recommended = getNextPublishDate({ publishDays: scheduleData?.publishDays, posts, today });
    setPublishingSlug(slug);
    setPublishMode("schedule");
    setPublishDate(recommended);
    setScheduledDate(recommended);
  };

  const handlePublishConfirm = async () => {
    if (!publishingSlug || !publishDate) return;
    setPublishing(true);
    setPublishError(null);
    const { error } = await mutate(`/api/admin/blog-posts/${publishingSlug}`, "PUT", { published: true, date: publishDate });
    setPublishing(false);
    if (error) {
      setPublishError(error);
      return;
    }
    setPublishedSlugs((prev) => new Set(prev).add(publishingSlug));
    setPublishingSlug(null);
    refetchPosts();
  };

  const handleReschedule = async (slug: string, newDate: string) => {
    if (!newDate) return;
    setRescheduling(true);
    const { error } = await mutate(`/api/admin/blog-posts/${slug}`, "PUT", { date: newDate });
    setRescheduling(false);
    setEditingDateSlug(null);
    if (!error) refetchPosts();
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    await mutate("/api/admin/revalidate", "POST");
    await refetchPosts();
    setRefreshing(false);
  };

  const handleSearchPeriodChange = (value: string) => {
    setSearchPeriod(value as "28d" | "90d" | "180d");
    setSelectedBlogPage(null);
    setSelectedBlogQuery(null);
  };

  return (
    <div className="space-y-6">
      <PostsHero
        blogStats={blogStats}
        refreshing={refreshing}
        onRefresh={handleRefreshCache}
        onCreatePost={handleCreate}
        onOpenAiWrite={() => setAiWriteOpen(true)}
      />

      {postsLoading && <AdminLoadingSkeleton variant="table" />}
      {postsError && <AdminErrorState message={postsError} onRetry={refetchPosts} />}
      {deleteError && (
        <AdminNotice tone="error">
          삭제 실패: {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 font-medium underline">닫기</button>
        </AdminNotice>
      )}

      {!postsLoading && !postsError && (
        <>
          <PostsSummaryCards
            blogStats={blogStats}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <PostsFilterPanel
            filtersOpen={filtersOpen}
            searchQuery={searchQuery}
            filteredCount={filteredPosts.length}
            categoryFilter={categoryFilter}
            statusFilter={statusFilter}
            sortKey={sortKey}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onSearchQueryChange={setSearchQuery}
            onCategoryFilterChange={setCategoryFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onSortKeyChange={setSortKey}
          />

          <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">포스트 목록</h3>
            {filteredPosts.length === 0 ? (
              <div className="rounded-lg bg-[var(--background)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                검색 결과가 없습니다
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredPosts.map((post) => (
                  <PostListItem
                    key={post.slug}
                    post={post}
                    today={today}
                    likesData={likesData}
                    likesLoading={likesLoading}
                    expanded={expandedSlug === post.slug}
                    draftRank={draftRankMap?.get(post.slug) ?? null}
                    editingDateSlug={editingDateSlug}
                    editingDateValue={editingDateValue}
                    rescheduling={rescheduling}
                    onToggleExpanded={(slug) => setExpandedSlug((current) => (current === slug ? null : slug))}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPublish={handlePublishOpen}
                    onStartEditingDate={(targetPost) => {
                      setEditingDateSlug(targetPost.slug);
                      setEditingDateValue(targetPost.date);
                    }}
                    onEditingDateValueChange={setEditingDateValue}
                    onReschedule={handleReschedule}
                    onCancelEditingDate={() => setEditingDateSlug(null)}
                  />
                ))}
              </ul>
            )}
          </section>

          <AdminDisclosureSection
            title="발행 정책과 일정"
            description="발행 요일, 예약 발행, 오늘 공개 글을 함께 점검합니다."
            countLabel={`${blogStats.scheduled}건 예약`}
            defaultOpen={blogStats.scheduled > 0}
            collapsedMessage="발행 요일 정책과 예약 현황은 필요할 때만 펼쳐 봅니다."
            titleLevel="h2"
          >
            <ContentScheduleManager
              embedded
              initialPublishDays={scheduleData?.publishDays}
              initialPosts={posts}
              loadingOverride={scheduleLoading}
            />
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="콘텐츠 성과 요약"
            description="카테고리 분포와 좋아요 반응을 빠르게 확인합니다."
            countLabel={`${blogStats.published}건 발행`}
            collapsedMessage="운영 판단이 필요할 때만 성과 요약을 펼쳐 봅니다."
            titleLevel="h2"
          >
            <ContentStatsPanel
              embedded
              initialPosts={posts}
              initialLikesData={likesData}
              initialLikesLoading={likesLoading}
              initialLikesError={likesError}
            />
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="블로그 검색 성과"
            description="콘텐츠 탭에서 블로그 포스트 기준으로 더 자세한 검색 성과를 확인합니다."
            countLabel={`${topBlogSearchPages.length}개 포스트`}
            collapsedMessage="검색 성과 상세 탭으로 이동하지 않아도 블로그 포스트 성과를 빠르게 훑을 수 있습니다."
            titleLevel="h2"
          >
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

                <div className="grid gap-5 xl:grid-cols-2">
                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">상위 블로그 포스트</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">검색 노출이 많은 글부터 확인합니다.</p>
                    </div>
                    <DataTable
                      keyField="page"
                      rows={topBlogSearchPages}
                      columns={[
                        {
                          key: "page",
                          label: "포스트",
                          render: (row) => {
                            const slug = getEditableBlogSlug((row as SearchConsoleData["blogPages"][number]).page);
                            return (
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[var(--foreground)]" title={(row as SearchConsoleData["blogPages"][number]).page}>
                                  {(row as SearchConsoleData["blogPages"][number]).page}
                                </p>
                                {slug && (
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBlogPage((current) => (
                                        current === (row as SearchConsoleData["blogPages"][number]).page
                                          ? null
                                          : (row as SearchConsoleData["blogPages"][number]).page
                                      ))}
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
                  </div>

                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">대표 유입 쿼리</h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">블로그 포스트 기준으로 우선 살필 키워드를 모았습니다.</p>
                    </div>
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
                  </div>
                </div>
              </div>
            )}
          </AdminDisclosureSection>
        </>
      )}

      {publishingSlug && (
        <PublishPopup
          publishDate={publishDate}
          publishMode={publishMode}
          scheduledDate={scheduledDate}
          publishing={publishing}
          today={today}
          error={publishError}
          onModeChange={(mode) => {
            setPublishMode(mode);
            if (mode === "schedule") setPublishDate(scheduledDate);
            else if (mode === "immediate") setPublishDate(today);
          }}
          onDateChange={setPublishDate}
          onConfirm={handlePublishConfirm}
          onClose={() => {
            setPublishingSlug(null);
            setPublishError(null);
          }}
        />
      )}

      {aiWriteOpen && (
        <AiWriteModal
          onClose={() => setAiWriteOpen(false)}
          onDraftReady={(draft) => {
            window.sessionStorage.setItem(BLOG_EDITOR_DRAFT_KEY, JSON.stringify(draft));
            setAiWriteOpen(false);
            router.push("/admin/content/posts/new?draft=1");
          }}
        />
      )}
    </div>
  );
}
