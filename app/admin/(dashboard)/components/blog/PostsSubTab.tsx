"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PublishPopup } from "@/components/admin/PublishPopup";
import type { PublishMode } from "@/components/admin/PublishPopup";
import type { BlogCategoryFilter } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { AdminNotice } from "@/components/admin/AdminNotice";
import type { AdminBlogPost, BlogLikesData, SortKey, StatusFilter } from "./blog-helpers";
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
  const { data: likesData, loading: likesLoading } = useAdminApi<BlogLikesData>("/api/admin/blog-likes");
  const { data: scheduleData } = useAdminApi<{ publishDays: number[] }>("/api/admin/site-config/schedule");
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
  const topDraft = filteredPosts.find((post) => !post.published) ?? null;

  const handleEdit = (post: AdminBlogPost) => {
    router.push(`/admin/content/posts/${post.slug}`);
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

  return (
    <div className="space-y-6">
      <PostsHero
        blogStats={blogStats}
        topDraft={topDraft}
        refreshing={refreshing}
        onRefresh={handleRefreshCache}
        onEditTopDraft={handleEdit}
        onPublishTopDraft={handlePublishOpen}
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
    </div>
  );
}
