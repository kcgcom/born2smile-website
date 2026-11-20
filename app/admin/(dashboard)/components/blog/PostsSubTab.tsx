"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { BLOG_CATEGORY_SLUGS, type BlogCategoryFilter } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";
import { validPerformanceEnd } from "@/lib/post-performance";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { AdminBlogPost, BlogFeedbackData, SortKey, StatusFilter } from "./blog-helpers";
import { BLOG_EDITOR_DRAFT_KEY } from "./blog-editor-draft";
import { CategoryDistributionPanel } from "./CategoryDistributionPanel";
import {
  PostListItem,
  PostsFilterPanel,
  PostsHero,
  PostsSummaryCards,
  getBlogStats,
  getDraftRankMap,
  getFilteredPosts,
} from "./posts-subtab-shared";

const PostPerformancePanel = dynamic(() => import("./PostPerformancePanel").then(module => module.PostPerformancePanel), { loading: () => <p role="status">성과 패널을 준비하는 중…</p> });

export function PostsSubTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = getTodayKST();

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const { data: feedbackData, loading: feedbackLoading } = useAdminApi<BlogFeedbackData>("/api/admin/blog-feedback");
  const { mutate } = useAdminMutation();

  const searchQuery = searchParams.get("q") ?? "";
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const categoryParam = searchParams.get("category");
  const categoryFilter: BlogCategoryFilter = BLOG_CATEGORY_SLUGS.includes(categoryParam as typeof BLOG_CATEGORY_SLUGS[number]) ? categoryParam as BlogCategoryFilter : "all";
  const statusParam = searchParams.get("status");
  const statusFilter: StatusFilter = statusParam === "draft" || statusParam === "published" || statusParam === "scheduled" ? statusParam : "all";
  const sortParam = searchParams.get("sort");
  const sortKey: SortKey = sortParam === "oldest" || sortParam === "unresolved" || sortParam === "newest" ? sortParam : statusFilter === "draft" ? "recommended" : "newest";
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const performanceSlug = searchParams.get("performance");
  const requestedPerformanceEnd = searchParams.get("performanceEnd");
  const performanceEnd = requestedPerformanceEnd && validPerformanceEnd(requestedPerformanceEnd, new Date())
    ? requestedPerformanceEnd : undefined;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<{ error: boolean; message: string } | null>(null);
  const [editingDateSlug, setEditingDateSlug] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const posts = useMemo(() => postsData ?? [], [postsData]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateFilters = (changes: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value && (key === "q" || value !== "all")) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  };
  const handleStatusFilterChange = (next: StatusFilter) => {
    updateFilters({ status: next, sort: next === "draft" ? "recommended" : sortKey === "recommended" ? "newest" : sortKey });
  };

  const handleResetFilters = () => {
    updateFilters({ q: "", category: "", status: "", sort: "" });
  };

  const blogStats = useMemo(() => getBlogStats(posts, today), [posts, today]);
  const filteredPosts = useMemo(
    () => getFilteredPosts({
      posts,
      feedbackData,
      today,
      searchQuery: debouncedQuery,
      categoryFilter,
      statusFilter,
      sortKey,
    }),
    [posts, feedbackData, today, debouncedQuery, categoryFilter, statusFilter, sortKey],
  );
  const draftRankMap = useMemo(() => getDraftRankMap(filteredPosts, sortKey), [filteredPosts, sortKey]);
  const performancePost = posts.find(post => post.slug === performanceSlug);
  const showPerformance = (slug: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("performance", slug);
    url.searchParams.delete("performanceEnd");
    window.history.pushState(null, "", url);
  };
  const closePerformance = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("performance");
    url.searchParams.delete("performanceEnd");
    window.history.replaceState(null, "", url);
  };

  const handleEdit = (post: AdminBlogPost) => {
    const query = new URLSearchParams(window.location.search);
    query.delete("performance");
    query.delete("performanceEnd");
    const suffix = query.size ? `?list=${encodeURIComponent(query.toString())}` : "";
    router.push(`/admin/content/posts/${post.slug}${suffix}`);
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

  const handleReschedule = async (slug: string, newDate: string) => {
    if (!newDate || rescheduling) return;
    setRescheduleError(null);
    setRescheduling(true);
    const { error } = await mutate(`/api/admin/blog-posts/${slug}`, "PUT", { date: newDate });
    setRescheduling(false);
    if (error) {
      setRescheduleError(error);
      return;
    }
    setEditingDateSlug(null);
    refetchPosts();
  };

  const handleRefreshCache = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const result = await mutate("/api/admin/revalidate", "POST");
      if (result.error) { setRefreshNotice({ error: true, message: `캐시 갱신 실패: ${result.error}` }); return; }
      refetchPosts();
      setRefreshNotice({ error: false, message: "캐시를 갱신했습니다. 포스트 목록을 새로고침합니다." });
    } finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PostsHero
        blogStats={blogStats}
        refreshing={refreshing}
        onRefresh={handleRefreshCache}
        onCreatePost={handleCreate}
      />

      {refreshNotice && <AdminNotice tone={refreshNotice.error ? "error" : "success"}>{refreshNotice.message}</AdminNotice>}

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
          <div className="space-y-3 sm:space-y-6 lg:space-y-3 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-4">
          <PostsSummaryCards
            blogStats={blogStats}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
          />

          <PostsFilterPanel
            searchQuery={searchQuery}
            filteredCount={filteredPosts.length}
            categoryFilter={categoryFilter}
            statusFilter={statusFilter}
            sortKey={sortKey}
            onSearchQueryChange={(value) => updateFilters({ q: value })}
            onCategoryFilterChange={(value) => updateFilters({ category: value })}
            onStatusFilterChange={handleStatusFilterChange}
            onSortKeyChange={(value) => updateFilters({ sort: value })}
            onResetFilters={handleResetFilters}
          />
          </div>

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
                    feedbackData={feedbackData}
                    feedbackLoading={feedbackLoading}
                    expanded={expandedSlug === post.slug}
                    draftRank={draftRankMap?.get(post.slug) ?? null}
                    editingDateSlug={editingDateSlug}
                    editingDateValue={editingDateValue}
                    rescheduling={rescheduling}
                    rescheduleError={rescheduleError}
                    onToggleExpanded={(slug) => setExpandedSlug((current) => (current === slug ? null : slug))}
                    onShowPerformance={showPerformance}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStartEditingDate={(targetPost) => {
                      if (rescheduling) return;
                      setRescheduleError(null);
                      setEditingDateSlug(targetPost.slug);
                      setEditingDateValue(targetPost.date);
                    }}
                    onEditingDateValueChange={(value) => {
                      setRescheduleError(null);
                      setEditingDateValue(value);
                    }}
                    onReschedule={handleReschedule}
                    onCancelEditingDate={() => {
                      if (rescheduling) return;
                      setRescheduleError(null);
                      setEditingDateSlug(null);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <details className="rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">카테고리별 분포 보기</summary>
            <div className="mt-4"><CategoryDistributionPanel posts={posts} today={today} /></div>
          </details>
        </>
      )}

      {performancePost && <PostPerformancePanel key={`${performancePost.slug}:${performanceEnd ?? ""}`} post={performancePost} endDate={performanceEnd} onClose={closePerformance} />}
    </div>
  );
}
