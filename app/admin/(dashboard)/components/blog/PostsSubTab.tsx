"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Trash2, Calendar, RefreshCw, Sparkles } from "lucide-react";
import { PublishPopup } from "@/components/admin/PublishPopup";
import type { PublishMode } from "@/components/admin/PublishPopup";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategoryFilter, BlogCategorySlug } from "@/lib/blog/types";
import { getAdminPreviewUrl, getBlogPostUrl, getCategoryLabel } from "@/lib/blog/category-slugs";
import { getTodayKST } from "@/lib/date";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { StatCard } from "../StatCard";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { calcDraftRecommendationOrder, HeartIcon } from "./blog-helpers";
import type { AdminBlogPost, BlogLikesData, SortKey, StatusFilter } from "./blog-helpers";

// -------------------------------------------------------------
// PostsSubTab
// -------------------------------------------------------------

export function PostsSubTab() {
  const router = useRouter();
  const today = getTodayKST();

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");

  // Optimistic publish: mark locally published slugs before server cache refreshes
  const [publishedSlugs, setPublishedSlugs] = useState<Set<string>>(new Set());
  const posts = useMemo(() => {
    const raw = postsData ?? [];
    if (publishedSlugs.size === 0) return raw;
    return raw.map((p) =>
      publishedSlugs.has(p.slug) ? { ...p, published: true } : p,
    );
  }, [postsData, publishedSlugs]);

  const { data: likesData, loading: likesLoading } =
    useAdminApi<BlogLikesData>("/api/admin/blog-likes");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<BlogCategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // statusFilter 변경 시 sortKey도 연동
  const handleStatusFilterChange = (next: StatusFilter) => {
    setStatusFilter(next);
    if (next === "draft") {
      setSortKey("recommended");
    } else if (sortKey === "recommended") {
      setSortKey("newest");
    }
  };

  // Schedule data for publish date recommendation
  const { data: scheduleData } = useAdminApi<{ publishDays: number[] }>(
    "/api/admin/site-config/schedule",
  );

  // CRUD state
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("schedule");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingDateSlug, setEditingDateSlug] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const { mutate } = useAdminMutation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Computed blog stats from API data (single pass)
  const blogStats = useMemo(() => {
    let published = 0, scheduled = 0, draft = 0;
    for (const p of posts) {
      if (!p.published) draft++;
      else if (p.date > today) scheduled++;
      else published++;
    }
    return { total: posts.length, published, scheduled, draft };
  }, [posts, today]);

  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Status filter
    if (statusFilter === "published") {
      filtered = filtered.filter((p) => p.published && p.date <= today);
    } else if (statusFilter === "scheduled") {
      filtered = filtered.filter((p) => p.published && p.date > today);
    } else if (statusFilter === "draft") {
      filtered = filtered.filter((p) => !p.published);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Text search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(q));
    }

    // Sort within groups
    if (sortKey === "recommended") {
      filtered = calcDraftRecommendationOrder(filtered, posts, today);
    } else if (sortKey === "newest") {
      filtered.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortKey === "oldest") {
      filtered.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortKey === "likes") {
      filtered.sort((a, b) => {
        const la = likesData?.likes[a.slug] ?? 0;
        const lb = likesData?.likes[b.slug] ?? 0;
        return lb - la;
      });
    }

    // 상태별 그룹 정렬: 초안 → 예약 → 발행 (전체 보기일 때만)
    // stable sort preserves the sort key order within each group
    if (statusFilter === "all") {
      const statusOrder = (p: AdminBlogPost) =>
        !p.published ? 0 : p.date > today ? 1 : 2;
      filtered.sort((a, b) => statusOrder(a) - statusOrder(b));
    }

    return filtered;
  }, [posts, debouncedQuery, categoryFilter, statusFilter, sortKey, today, likesData]);

  // Pre-compute draft ranks to avoid O(n²) in render loop
  const draftRankMap = useMemo(() => {
    if (sortKey !== "recommended") return null;
    const map = new Map<string, number>();
    let rank = 0;
    for (const p of filteredPosts) {
      if (!p.published) map.set(p.slug, ++rank);
    }
    return map;
  }, [filteredPosts, sortKey]);
  const topDraft = filteredPosts.find((post) => !post.published) ?? null;

  // CRUD handlers
  const handleEdit = (post: AdminBlogPost) => {
    router.push(`/admin/content/posts/${post.slug}`);
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (slug: string) => {
    if (!window.confirm("이 포스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleteError(null);
    const { error } = await mutate(`/api/admin/blog-posts/${slug}`, "DELETE");
    if (error) {
      setDeleteError(error);
    } else {
      refetchPosts();
    }
  };

  // Publish flow
  const getNextPublishDate = (): string => {
    const days = scheduleData?.publishDays ?? [1, 3, 5];
    if (days.length === 0) {
      const [y, m, d] = today.split("-").map(Number);
      const tom = new Date(y, m - 1, d + 1);
      return tom.toISOString().slice(0, 10);
    }
    // Collect dates already occupied (published posts with today or future dates)
    const scheduledDates = new Set(
      posts.filter((p) => p.published && p.date >= today).map((p) => p.date),
    );
    // Find next available date starting from today (KST-based)
    const [y, m, d] = today.split("-").map(Number);
    const cursor = new Date(y, m - 1, d);
    for (let i = 0; i < 90; i++) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const dow = cursor.getDay(); // 0=Sun
      if (days.includes(dow) && !scheduledDates.has(iso)) {
        return iso;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    // Fallback: tomorrow (KST-aware)
    const fb = new Date(y, m - 1, d + 1);
    return `${fb.getFullYear()}-${String(fb.getMonth() + 1).padStart(2, "0")}-${String(fb.getDate()).padStart(2, "0")}`;
  };

  const handlePublishOpen = (slug: string) => {
    const recommended = getNextPublishDate();
    setPublishingSlug(slug);
    setPublishMode("schedule");
    setPublishDate(recommended);
    setScheduledDate(recommended);
  };

  const [publishError, setPublishError] = useState<string | null>(null);

  const handlePublishConfirm = async () => {
    if (!publishingSlug || !publishDate) return;
    setPublishing(true);
    setPublishError(null);
    const { error } = await mutate(
      `/api/admin/blog-posts/${publishingSlug}`,
      "PUT",
      { published: true, date: publishDate },
    );
    setPublishing(false);
    if (error) {
      setPublishError(error);
    } else {
      // Optimistic: immediately mark as published in local state
      setPublishedSlugs((prev) => new Set(prev).add(publishingSlug));
      setPublishingSlug(null);
      refetchPosts();
    }
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
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="white">포스트 관리</AdminPill>
              <AdminPill tone={blogStats.draft > 0 ? "warning" : "white"}>
                {blogStats.draft > 0 ? "초안 우선 정리 필요" : "운영 안정"}
              </AdminPill>
            </div>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">기존 글 상태와 초안 정리를 한 화면에서 관리합니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              목록 정리와 수정 작업에 집중하고, 새 글 작성과 발행 준비는 발행 일정 탭에서 이어집니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
            onClick={handleRefreshCache}
            disabled={refreshing}
            title="캐시 새로고침 (Supabase 직접 수정 후 사용)"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "새로고침 중..." : "캐시 갱신"}
          </button>
          </div>
        </div>

        {topDraft && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">먼저 볼 초안</span>
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{topDraft.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              카테고리 {getCategoryLabel(topDraft.category)} · 작성일 {topDraft.date || "미정"} · 추천순 상단
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminActionButton tone="dark" onClick={() => handleEdit(topDraft)} className="min-h-8 px-3 py-1 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                초안 열기
              </AdminActionButton>
              <AdminActionButton tone="dark" onClick={() => handlePublishOpen(topDraft.slug)} className="min-h-8 px-3 py-1 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                발행 예약
              </AdminActionButton>
            </div>
          </div>
        )}
      </AdminSurface>

      {/* Posts loading / error */}
      {postsLoading && <AdminLoadingSkeleton variant="table" />}
      {postsError && (
        <AdminErrorState message={postsError} onRetry={refetchPosts} />
      )}
      {deleteError && (
        <AdminNotice tone="error">
          삭제 실패: {deleteError}
          <button onClick={() => setDeleteError(null)} className="ml-2 font-medium underline">닫기</button>
        </AdminNotice>
      )}

      {!postsLoading && !postsError && (
        <>
          {/* Summary cards (clickable filters) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="전체 포스트" value={blogStats.total} variant="elevated" onClick={() => handleStatusFilterChange("all")} active={statusFilter === "all"} />
            <StatCard label="발행" value={blogStats.published} color="text-green-600" variant="elevated" onClick={() => handleStatusFilterChange("published")} active={statusFilter === "published"} />
            <StatCard label="예약" value={blogStats.scheduled} color="text-[var(--color-gold)]" variant="elevated" onClick={() => handleStatusFilterChange("scheduled")} active={statusFilter === "scheduled"} />
            <StatCard label="초안" value={blogStats.draft} color="text-[var(--muted)]" variant="elevated" onClick={() => handleStatusFilterChange("draft")} active={statusFilter === "draft"} />
          </div>

          {/* Search & Filter bar */}
          <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">목록 필터</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">필요할 때만 상세 필터를 펼쳐 목록 범위를 줄일 수 있습니다.</p>
              </div>
              <AdminActionButton
                tone="dark"
                onClick={() => setFiltersOpen((current) => !current)}
                className="min-h-8 px-3 py-1 text-xs"
              >
                {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {filtersOpen ? "필터 접기" : "필터 열기"}
              </AdminActionButton>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Text search */}
              <input
                type="search"
                placeholder="제목 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 min-w-[160px]"
              />

            </div>

            {filtersOpen && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* Category dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as BlogCategoryFilter)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="all">전체 카테고리</option>
                  {BLOG_CATEGORY_SLUGS.map((cat) => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="all">전체 상태</option>
                  <option value="published">발행</option>
                  <option value="scheduled">예약</option>
                  <option value="draft">초안</option>
                </select>

                {/* Sort */}
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="likes">좋아요순</option>
                  {statusFilter === "draft" && (
                    <option value="recommended">추천순</option>
                  )}
                </select>
              </div>
            )}

            {/* Results count */}
            <p className="mt-3 text-xs text-[var(--muted)]">
              {filteredPosts.length}개 포스트 · 상태 {statusFilter === "all" ? "전체" : statusFilter} · 정렬 {sortKey}
            </p>
          </section>

          {/* Post list */}
          <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">포스트 목록</h3>
            {filteredPosts.length === 0 ? (
              <div className="rounded-lg bg-[var(--background)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                검색 결과가 없습니다
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredPosts.map((post) => {
                  const isPublished = post.published && post.date <= today;
                  const likeCount = likesData?.likes[post.slug] ?? 0;
                  const dDay =
                    post.published && post.date > today
                      ? Math.ceil(
                          (new Date(post.date).getTime() - new Date(today).getTime()) / 86400000,
                        )
                      : null;
                  const catColor =
                    categoryColors[post.category as BlogCategorySlug] ?? "bg-[var(--background)] text-[var(--muted)]";

                  const isDraft = !post.published;
                  const statusLabel = isDraft
                    ? "초안"
                    : isPublished
                    ? "발행"
                    : "예약";
                  const statusClass = isDraft
                    ? "bg-amber-50 text-amber-700"
                    : isPublished
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700";
                  const draftRank = draftRankMap?.get(post.slug) ?? null;
                  const expanded = expandedSlug === post.slug;

                  return (
                    <li
                      key={post.slug}
                      className={`flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm${isDraft ? " border-l-4 border-l-amber-400" : dDay !== null ? " border-l-4 border-l-blue-400" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${catColor}`}>
                              {getCategoryLabel(post.category)}
                            </span>
                            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                            {draftRank !== null && (
                              <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                추천 #{draftRank}
                              </span>
                            )}
                          </div>
                          {isDraft ? (
                            <a
                              href={getAdminPreviewUrl(post.slug, post.category)}
                              target="_blank"
                              rel="noopener"
                              className="mt-2 block truncate font-medium text-[var(--foreground)] hover:text-amber-600 hover:underline"
                              title="초안 미리보기"
                            >
                              {post.title}
                            </a>
                          ) : (
                            <a
                              href={getBlogPostUrl(post.slug, post.category)}
                              target="_blank"
                              rel="noopener"
                              className="mt-2 block truncate font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                            >
                              {post.title}
                            </a>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <span>{isDraft ? "미정" : post.date}</span>
                            {dDay !== null && <span className="font-medium text-amber-600">D-{dDay}</span>}
                            <span className="flex items-center gap-1">
                              <HeartIcon />
                              {likesLoading ? "..." : likeCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!expanded && (
                            <button
                              onClick={() => handleEdit(post)}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-blue-50 hover:text-[var(--color-primary)] transition-colors"
                              aria-label={`${post.title} 수정`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              수정
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedSlug((current) => current === post.slug ? null : post.slug)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
                          >
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {expanded ? "접기" : "상세"}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <span>슬러그: {post.slug}</span>
                            <span>읽기 시간: {post.readTime}</span>
                            {post.dateModified && <span>수정일: {post.dateModified}</span>}
                          </div>
                          <p className="mt-3 text-sm text-[var(--foreground)]">{post.subtitle}</p>
                          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{post.excerpt}</p>
                          {post.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {post.tags.map((tag) => (
                                <span key={`${post.slug}-${tag}`} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {editingDateSlug === post.slug ? (
                              <>
                                <input
                                  type="date"
                                  value={editingDateValue}
                                  min={today}
                                  onChange={(e) => setEditingDateValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void handleReschedule(post.slug, editingDateValue);
                                    if (e.key === "Escape") setEditingDateSlug(null);
                                  }}
                                  autoFocus
                                  className="rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                  onClick={() => void handleReschedule(post.slug, editingDateValue)}
                                  disabled={rescheduling}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingDateSlug(null)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] transition-colors"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                {dDay !== null && (
                                  <button
                                    onClick={() => { setEditingDateSlug(post.slug); setEditingDateValue(post.date); }}
                                    className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                                  >
                                    발행일 변경
                                  </button>
                                )}
                                {isDraft && (
                                  <button
                                    onClick={() => handlePublishOpen(post.slug)}
                                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
                                    aria-label={`${post.title} 발행`}
                                  >
                                    <Calendar className="h-3.5 w-3.5" />
                                    발행
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(post)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-blue-50 hover:text-[var(--color-primary)] transition-colors"
                                  aria-label={`${post.title} 수정`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDelete(post.slug)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-red-50 hover:text-red-600 transition-colors"
                                  aria-label={`${post.title} 삭제`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Publish popup */}
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
          onClose={() => { setPublishingSlug(null); setPublishError(null); }}
        />
      )}
    </div>
  );
}
