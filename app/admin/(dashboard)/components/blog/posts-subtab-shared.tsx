"use client";

import { Calendar, ChevronDown, ChevronUp, Pencil, RefreshCw, RotateCcw, Search, Trash2, X } from "lucide-react";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import type { BlogCategoryFilter, BlogCategorySlug } from "@/lib/blog/types";
import { categoryColors } from "@/lib/blog/category-colors";
import { getAdminPreviewUrl, getBlogPostUrl, getCategoryLabel } from "@/lib/blog/category-slugs";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { StatCard } from "../StatCard";
import { calcDraftRecommendationOrder, HeartIcon } from "./blog-helpers";
import type { AdminBlogPost, BlogLikesData, SortKey, StatusFilter } from "./blog-helpers";

export interface BlogStats {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
}

interface FilterPostsParams {
  posts: AdminBlogPost[];
  likesData?: BlogLikesData | null;
  today: string;
  searchQuery: string;
  categoryFilter: BlogCategoryFilter;
  statusFilter: StatusFilter;
  sortKey: SortKey;
}

interface PostsHeroProps {
  blogStats: BlogStats;
  refreshing: boolean;
  onRefresh: () => void;
  onCreatePost: () => void;
}

interface PostsSummaryCardsProps {
  blogStats: BlogStats;
  statusFilter: StatusFilter;
  onStatusFilterChange: (next: StatusFilter) => void;
}

interface PostsFilterPanelProps {
  searchQuery: string;
  filteredCount: number;
  categoryFilter: BlogCategoryFilter;
  statusFilter: StatusFilter;
  sortKey: SortKey;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: BlogCategoryFilter) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSortKeyChange: (value: SortKey) => void;
  onResetFilters: () => void;
}

interface PostListItemProps {
  post: AdminBlogPost;
  today: string;
  likesData?: BlogLikesData | null;
  likesLoading: boolean;
  expanded: boolean;
  draftRank: number | null;
  editingDateSlug: string | null;
  editingDateValue: string;
  rescheduling: boolean;
  onToggleExpanded: (slug: string) => void;
  onEdit: (post: AdminBlogPost) => void;
  onDelete: (slug: string) => void;
  onPublish: (slug: string) => void;
  onStartEditingDate: (post: AdminBlogPost) => void;
  onEditingDateValueChange: (value: string) => void;
  onReschedule: (slug: string, newDate: string) => void;
  onCancelEditingDate: () => void;
}

export function getBlogStats(posts: AdminBlogPost[], today: string): BlogStats {
  let published = 0;
  let scheduled = 0;
  let draft = 0;

  for (const post of posts) {
    if (!post.published) draft += 1;
    else if (post.date > today) scheduled += 1;
    else published += 1;
  }

  return { total: posts.length, published, scheduled, draft };
}

export function getFilteredPosts({
  posts,
  likesData,
  today,
  searchQuery,
  categoryFilter,
  statusFilter,
  sortKey,
}: FilterPostsParams): AdminBlogPost[] {
  let filtered = [...posts];

  if (statusFilter === "published") {
    filtered = filtered.filter((post) => post.published && post.date <= today);
  } else if (statusFilter === "scheduled") {
    filtered = filtered.filter((post) => post.published && post.date > today);
  } else if (statusFilter === "draft") {
    filtered = filtered.filter((post) => !post.published);
  }

  if (categoryFilter !== "all") {
    filtered = filtered.filter((post) => post.category === categoryFilter);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    filtered = filtered.filter((post) => post.title.toLowerCase().includes(query));
  }

  if (sortKey === "recommended") {
    filtered = calcDraftRecommendationOrder(filtered, posts, today);
  } else if (sortKey === "newest") {
    filtered.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sortKey === "oldest") {
    filtered.sort((a, b) => a.date.localeCompare(b.date));
  } else if (sortKey === "likes") {
    filtered.sort((a, b) => {
      const aLikes = likesData?.likes[a.slug] ?? 0;
      const bLikes = likesData?.likes[b.slug] ?? 0;
      return bLikes - aLikes;
    });
  }

  if (statusFilter === "all") {
    const statusOrder = (post: AdminBlogPost) => (!post.published ? 0 : post.date > today ? 1 : 2);
    filtered.sort((a, b) => statusOrder(a) - statusOrder(b));
  }

  return filtered;
}

export function getDraftRankMap(filteredPosts: AdminBlogPost[], sortKey: SortKey) {
  if (sortKey !== "recommended") return null;

  const map = new Map<string, number>();
  let rank = 0;
  for (const post of filteredPosts) {
    if (!post.published) map.set(post.slug, ++rank);
  }
  return map;
}

export function getNextPublishDate({
  publishDays,
  posts,
  today,
}: {
  publishDays?: number[];
  posts: AdminBlogPost[];
  today: string;
}) {
  const days = publishDays ?? [1, 3, 5];
  if (days.length === 0) {
    const [y, m, d] = today.split("-").map(Number);
    const tomorrow = new Date(y, m - 1, d + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  const scheduledDates = new Set(posts.filter((post) => post.published && post.date >= today).map((post) => post.date));
  const [y, m, d] = today.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);

  for (let i = 0; i < 90; i += 1) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const dayOfWeek = cursor.getDay();
    if (days.includes(dayOfWeek) && !scheduledDates.has(iso)) {
      return iso;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const fallback = new Date(y, m - 1, d + 1);
  return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(fallback.getDate()).padStart(2, "0")}`;
}

export function PostsHero({
  blogStats,
  refreshing,
  onRefresh,
  onCreatePost,
}: PostsHeroProps) {
  return (
    <AdminSurface tone="white" className="rounded-3xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminPill tone="white">포스트 운영</AdminPill>
            <AdminPill tone={blogStats.draft > 0 ? "warning" : "white"}>
              {blogStats.draft > 0 ? "초안 우선 정리 필요" : "운영 안정"}
            </AdminPill>
          </div>
          <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">글 상태와 초안을 빠르게 정리합니다.</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            작성, 발행, 일정, 성과 요약까지 한 화면에서 관리합니다.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            초안 {blogStats.draft}건 · 예약 {blogStats.scheduled}건 · 발행 {blogStats.published}건
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <AdminActionButton tone="primary" onClick={onCreatePost} className="min-h-10 w-full px-4 py-2 text-sm sm:w-auto">
            <Pencil className="h-4 w-4" />
            새 글 작성
          </AdminActionButton>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="캐시 새로고침 (Supabase 직접 수정 후 사용)"
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "새로고침 중..." : "캐시 갱신"}
          </button>
        </div>
      </div>

    </AdminSurface>
  );
}

export function PostsSummaryCards({ blogStats, statusFilter, onStatusFilterChange }: PostsSummaryCardsProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="전체 포스트" value={blogStats.total} variant="elevated" onClick={() => onStatusFilterChange("all")} active={statusFilter === "all"} />
        <StatCard label="발행" value={blogStats.published} color="text-green-600" variant="elevated" onClick={() => onStatusFilterChange("published")} active={statusFilter === "published"} />
        <StatCard label="예약" value={blogStats.scheduled} color="text-[var(--color-gold)]" variant="elevated" onClick={() => onStatusFilterChange("scheduled")} active={statusFilter === "scheduled"} />
        <StatCard label="초안" value={blogStats.draft} color="text-[var(--muted)]" variant="elevated" onClick={() => onStatusFilterChange("draft")} active={statusFilter === "draft"} />
      </div>
      <p className="text-xs text-[var(--muted)]">요약 카드를 누르면 포스트 목록이 해당 상태로 바로 필터링됩니다.</p>
    </div>
  );
}

export function PostsFilterPanel({
  searchQuery,
  filteredCount,
  categoryFilter,
  statusFilter,
  sortKey,
  onSearchQueryChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onSortKeyChange,
  onResetFilters,
}: PostsFilterPanelProps) {
  const statusLabels: Record<StatusFilter, string> = {
    all: "전체 상태",
    published: "발행",
    scheduled: "예약",
    draft: "초안",
  };
  const sortLabels: Record<SortKey, string> = {
    newest: "최신순",
    oldest: "오래된순",
    likes: "좋아요순",
    recommended: "추천순",
  };
  const categoryLabel = categoryFilter === "all" ? "전체 카테고리" : getCategoryLabel(categoryFilter);
  const hasActiveFilters = searchQuery.trim().length > 0 || categoryFilter !== "all" || statusFilter !== "all" || sortKey !== "newest";

  return (
    <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">목록 필터</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">검색, 상태, 카테고리, 정렬을 바로 조정합니다.</p>
        </div>
        <p className="text-xs font-medium text-[var(--muted)]">{filteredCount.toLocaleString("ko-KR")}개 표시</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_140px_140px_auto]">
        <label className="relative block">
          <span className="sr-only">제목 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            placeholder="제목 검색..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          />
        </label>

        <select
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value as BlogCategoryFilter)}
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          aria-label="카테고리 필터"
        >
          <option value="all">전체 카테고리</option>
          {BLOG_CATEGORY_SLUGS.map((category) => (
            <option key={category} value={category}>{getCategoryLabel(category)}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          aria-label="상태 필터"
        >
          <option value="all">전체 상태</option>
          <option value="published">발행</option>
          <option value="scheduled">예약</option>
          <option value="draft">초안</option>
        </select>

        <select
          value={sortKey}
          onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          aria-label="정렬"
        >
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="likes">좋아요순</option>
          {statusFilter === "draft" && <option value="recommended">추천순</option>}
        </select>

        <AdminActionButton
          type="button"
          tone="dark"
          onClick={onResetFilters}
          disabled={!hasActiveFilters}
          className="min-h-9 w-full rounded-lg px-3 py-1.5 text-xs lg:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </AdminActionButton>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-[var(--muted)]">적용 필터</span>
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            검색: {searchQuery.trim()}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {categoryFilter !== "all" && (
          <button
            type="button"
            onClick={() => onCategoryFilterChange("all")}
            className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {categoryLabel}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {statusLabels[statusFilter]}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {sortKey !== "newest" && (
          <button
            type="button"
            onClick={() => onSortKeyChange("newest")}
            className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {sortLabels[sortKey]}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {!hasActiveFilters && <span className="text-[var(--muted)]">기본 보기</span>}
      </div>
    </section>
  );
}

export function PostListItem({
  post,
  today,
  likesData,
  likesLoading,
  expanded,
  draftRank,
  editingDateSlug,
  editingDateValue,
  rescheduling,
  onToggleExpanded,
  onEdit,
  onDelete,
  onPublish,
  onStartEditingDate,
  onEditingDateValueChange,
  onReschedule,
  onCancelEditingDate,
}: PostListItemProps) {
  const isPublished = post.published && post.date <= today;
  const likeCount = likesData?.likes[post.slug] ?? 0;
  const dDay = post.published && post.date > today
    ? Math.ceil((new Date(post.date).getTime() - new Date(today).getTime()) / 86400000)
    : null;
  const categoryColor = categoryColors[post.category as BlogCategorySlug] ?? "bg-[var(--background)] text-[var(--muted)]";

  const isDraft = !post.published;
  const isScheduled = post.published && post.date > today;
  const statusLabel = isDraft ? "초안" : isPublished ? "발행" : "예약";
  const statusClass = isDraft
    ? "bg-amber-50 text-amber-700"
    : isPublished
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700";

  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm${isDraft ? " border-l-4 border-l-amber-400" : dDay !== null ? " border-l-4 border-l-blue-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
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
          {isDraft || isScheduled ? (
            <a
              href={getAdminPreviewUrl(post.slug, post.category)}
              target="_blank"
              rel="noopener"
              className="mt-2 block truncate font-medium text-[var(--foreground)] hover:text-amber-600 hover:underline"
              title={isDraft ? "초안 미리보기" : "예약 글 미리보기"}
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
              onClick={() => onEdit(post)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-blue-50 hover:text-[var(--color-primary)]"
              aria-label={`${post.title} 수정`}
            >
              <Pencil className="h-3.5 w-3.5" />
              수정
            </button>
          )}
          <button
            onClick={() => onToggleExpanded(post.slug)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface)]"
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
                  onChange={(event) => onEditingDateValueChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onReschedule(post.slug, editingDateValue);
                    if (event.key === "Escape") onCancelEditingDate();
                  }}
                  autoFocus
                  className="rounded border border-blue-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={() => onReschedule(post.slug, editingDateValue)}
                  disabled={rescheduling}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={onCancelEditingDate}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--surface)]"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                {dDay !== null && (
                  <button
                    onClick={() => onStartEditingDate(post)}
                    className="rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    발행일 변경
                  </button>
                )}
                {isDraft && (
                  <button
                    onClick={() => onPublish(post.slug)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
                    aria-label={`${post.title} 발행`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    발행
                  </button>
                )}
                <button
                  onClick={() => onEdit(post)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-blue-50 hover:text-[var(--color-primary)]"
                  aria-label={`${post.title} 수정`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  수정
                </button>
                <button
                  onClick={() => onDelete(post.slug)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600"
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
}
