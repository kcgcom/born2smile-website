"use client";

import { useId, useState } from "react";
import { BarChart3, Check, MessageCircle, ChevronDown, ChevronUp, Copy, Pencil, RefreshCw, RotateCcw, Search, Trash2, X } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import type { BlogCategoryFilter, BlogCategorySlug } from "@/lib/blog/types";
import { categoryColors } from "@/lib/blog/category-colors";
import { getAdminPreviewUrl, getBlogPostUrl, getCategoryLabel } from "@/lib/blog/category-slugs";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { calcDraftRecommendationOrder } from "./blog-helpers";
import type { AdminBlogPost, BlogFeedbackData, SortKey, StatusFilter } from "./blog-helpers";

export const UNTAGGED_FILTER = "__untagged";

export interface BlogStats {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
}

interface FilterPostsParams {
  posts: AdminBlogPost[];
  feedbackData?: BlogFeedbackData | null;
  today: string;
  searchQuery: string;
  categoryFilter: BlogCategoryFilter;
  statusFilter: StatusFilter;
  tagFilter: string;
  sortKey: SortKey;
}

interface PostsHeroProps {
  blogStats: BlogStats;
  refreshing: boolean;
  onRefresh?: () => void;
  onCreatePost?: () => void;
}

interface PostsSummaryCardsProps {
  blogStats: BlogStats;
  statusFilter: StatusFilter;
  onStatusFilterChange: (next: StatusFilter) => void;
}

interface PostsFilterPanelProps {
  blogStats: BlogStats;
  searchQuery: string;
  filteredCount: number;
  categoryFilter: BlogCategoryFilter;
  tagFilter: string;
  tagOptions: string[];
  statusFilter: StatusFilter;
  sortKey: SortKey;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: BlogCategoryFilter) => void;
  onTagFilterChange: (value: string) => void;
  onStatusFilterChange?: (value: StatusFilter) => void;
  onSortKeyChange: (value: SortKey) => void;
  onResetFilters: () => void;
}

interface PostListItemProps {
  post: AdminBlogPost;
  today: string;
  feedbackData?: BlogFeedbackData | null;
  feedbackLoading: boolean;
  expanded: boolean;
  draftRank: number | null;
  editingDateSlug: string | null;
  editingDateValue: string;
  rescheduling: boolean;
  rescheduleError: string | null;
  onToggleExpanded: (slug: string) => void;
  onShowPerformance: (slug: string) => void;
  onEdit: (post: AdminBlogPost) => void;
  canPublish: boolean;
  onDelete: (slug: string) => void;
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
  feedbackData,
  today,
  searchQuery,
  categoryFilter,
  statusFilter,
  tagFilter,
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

  if (tagFilter) {
    filtered = tagFilter === UNTAGGED_FILTER
      ? filtered.filter((post) => post.tags.length === 0)
      : filtered.filter((post) => post.tags.includes(tagFilter));
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
  } else if (sortKey === "unresolved") {
    filtered.sort((a, b) => {
      const aLikes = feedbackData?.feedback[a.slug]?.unresolved ?? 0;
      const bLikes = feedbackData?.feedback[b.slug]?.unresolved ?? 0;
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

export { getNextPublishDate } from "@/lib/publish-schedule";

export function PostsHero({
  blogStats,
  refreshing,
  onRefresh,
  onCreatePost,
}: PostsHeroProps) {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-3 sm:rounded-3xl sm:p-6 lg:px-4 lg:py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="hidden flex-wrap items-center gap-2 sm:flex lg:hidden">
            <AdminPill tone="white">포스트 운영</AdminPill>
            <AdminPill tone={blogStats.draft > 0 ? "warning" : "white"}>
              {blogStats.draft > 0 ? "초안 우선 정리 필요" : "운영 안정"}
            </AdminPill>
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)] sm:mt-2 lg:mt-0">포스트 관리</h2>
          <p className="mt-1 hidden text-sm text-[var(--muted)] sm:block lg:hidden">
            작성, 발행, 일정, 성과 요약까지 한 화면에서 관리합니다.
          </p>
          <p className="mt-2 hidden text-xs text-[var(--muted)] sm:block lg:hidden">
            초안 {blogStats.draft}건 · 예약 {blogStats.scheduled}건 · 발행 {blogStats.published}건
          </p>
        </div>
        {(onCreatePost || onRefresh) && <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {onCreatePost && <AdminActionButton tone="primary" onClick={onCreatePost} className="min-h-11 w-full px-3 py-2 text-sm sm:w-auto">
            <Pencil className="h-4 w-4" />
            새 글 작성
          </AdminActionButton>}
          {onRefresh && <button
            onClick={onRefresh}
            disabled={refreshing}
            title="캐시 새로고침 (Supabase 직접 수정 후 사용)"
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "새로고침 중..." : "캐시 갱신"}
          </button>}
        </div>}
      </div>

    </AdminSurface>
  );
}

export function PostsSummaryCards({ blogStats, statusFilter, onStatusFilterChange }: PostsSummaryCardsProps) {
  return (
    <div className="hidden space-y-2 lg:block">
      <div role="group" aria-label="포스트 상태" className="grid grid-cols-4 gap-2 lg:w-fit">
        {([
          ["all", "전체 포스트", blogStats.total], ["published", "발행", blogStats.published],
          ["scheduled", "예약", blogStats.scheduled], ["draft", "초안", blogStats.draft],
        ] as const).map(([status, label, value]) => <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => onStatusFilterChange(status)} className={`min-h-12 rounded-xl border bg-white px-1 py-1 text-center sm:min-h-16 sm:py-2 lg:flex lg:min-h-11 lg:items-center lg:gap-2 lg:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${statusFilter === status ? "border-blue-600 text-blue-700 ring-1 ring-blue-600" : "border-slate-200 text-slate-700"}`}><span className="block text-lg font-bold lg:text-sm">{value}</span><span className="block text-xs">{label}</span></button>)}
      </div>
      <p className="sr-only">상태를 누르면 포스트 목록이 해당 상태로 필터링됩니다.</p>
    </div>
  );
}

export function PostsFilterPanel({
  blogStats,
  searchQuery,
  filteredCount,
  categoryFilter,
  tagFilter,
  tagOptions,
  statusFilter,
  sortKey,
  onSearchQueryChange,
  onCategoryFilterChange,
  onTagFilterChange,
  onStatusFilterChange,
  onSortKeyChange,
  onResetFilters,
}: PostsFilterPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const statusLabels: Record<StatusFilter, string> = {
    all: "전체 상태",
    published: "발행",
    scheduled: "예약",
    draft: "초안",
  };
  const sortLabels: Record<SortKey, string> = {
    newest: "최신순",
    oldest: "오래된순",
    unresolved: "미해결 많은순",
    recommended: "추천순",
  };
  const categoryLabel = categoryFilter === "all" ? "전체 카테고리" : getCategoryLabel(categoryFilter);
  const tagLabel = tagFilter === UNTAGGED_FILTER ? "미분류" : tagFilter === "치료후관리" ? "치료 후 관리" : tagFilter;
  const extraFilterCount = Number(categoryFilter !== "all") + Number(Boolean(tagFilter)) + Number(sortKey !== (statusFilter === "draft" ? "recommended" : "newest"));
  const hasActiveFilters = searchQuery.trim().length > 0 || !!tagFilter || categoryFilter !== "all" || statusFilter !== "all" || sortKey !== "newest";

  return (
    <section className="rounded-xl bg-[var(--surface)] p-3 shadow-sm sm:p-5 lg:p-0 lg:shadow-none">
      <div className={`grid gap-2 ${onStatusFilterChange ? "grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(140px,1.5fr)_repeat(4,minmax(0,1fr))_auto]" : "grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(140px,1.5fr)_repeat(3,minmax(0,1fr))_auto]"}`}>
        <label className="relative block min-w-0">
          <span className="sr-only">제목 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            placeholder="제목 검색..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          />
        </label>

        {onStatusFilterChange && <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
          aria-label="상태 필터"
        >
          <option value="all">전체 {blogStats.total}</option>
          <optgroup label="상태별">
            <option value="published">발행 {blogStats.published}</option>
            <option value="scheduled">예약 {blogStats.scheduled}</option>
            <option value="draft">초안 {blogStats.draft}</option>
          </optgroup>
        </select>}

        <AdminActionButton
          type="button"
          tone="dark"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen(open => !open)}
          className="min-h-11 px-2 text-sm lg:hidden"
        >
          필터{extraFilterCount > 0 && <span>{extraFilterCount}</span>}
        </AdminActionButton>

        <div id={filtersId} className={`col-span-full grid grid-cols-2 gap-2 lg:contents ${filtersOpen ? "" : "max-lg:hidden"}`}>
          <select
            value={categoryFilter}
            onChange={(event) => onCategoryFilterChange(event.target.value as BlogCategoryFilter)}
            className="h-11 min-w-0 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            aria-label="카테고리 필터"
          >
            <option value="all">전체 카테고리</option>
            <optgroup label="카테고리별">
              {BLOG_CATEGORY_SLUGS.map((category) => (
                <option key={category} value={category}>{getCategoryLabel(category)}</option>
              ))}
            </optgroup>
          </select>

          <select
            value={tagFilter}
            onChange={(event) => onTagFilterChange(event.target.value)}
            className="h-11 min-w-0 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            aria-label="태그 필터"
          >
            <option value="">전체 태그</option>
            <optgroup label="분류 상태">
              <option value={UNTAGGED_FILTER}>미분류</option>
            </optgroup>
            <optgroup label="태그별">
              {tagOptions.map((tag) => <option key={tag} value={tag}>{tag === "치료후관리" ? "치료 후 관리" : tag}</option>)}
            </optgroup>
          </select>

          <select
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
            aria-label="정렬"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="unresolved">미해결 많은순</option>
            {statusFilter === "draft" && <option value="recommended">추천순</option>}
          </select>

          <AdminActionButton
            type="button"
            tone="dark"
            onClick={onResetFilters}
            disabled={!hasActiveFilters}
            className="min-h-11 w-full rounded-lg px-3 py-1.5 text-xs lg:w-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </AdminActionButton>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-[var(--muted)]">{filteredCount.toLocaleString("ko-KR")}개 표시</p>

      {hasActiveFilters && <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${filtersOpen ? "" : "max-lg:hidden"}`}>
        <span className="font-medium text-[var(--muted)]">적용 필터</span>
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            검색: {searchQuery.trim()}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {categoryFilter !== "all" && (
          <button
            type="button"
            onClick={() => onCategoryFilterChange("all")}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {categoryLabel}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {tagFilter && (
          <button
            type="button"
            onClick={() => onTagFilterChange("")}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {tagFilter === UNTAGGED_FILTER ? tagLabel : `태그 ${tagLabel}`}
            <X className="h-3 w-3 text-[var(--muted)]" aria-hidden="true" />
          </button>
        )}
        {onStatusFilterChange && statusFilter !== "all" && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("all")}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {statusLabels[statusFilter]}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
        {sortKey !== "newest" && (
          <button
            type="button"
            onClick={() => onSortKeyChange("newest")}
            className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--background)] px-2.5 font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]"
          >
            {sortLabels[sortKey]}
            <X className="h-3 w-3 text-[var(--muted)]" />
          </button>
        )}
      </div>}
    </section>
  );
}

export function PostListItem({
  post,
  today,
  feedbackData,
  feedbackLoading,
  expanded,
  draftRank,
  editingDateSlug,
  editingDateValue,
  rescheduling,
  rescheduleError,
  onToggleExpanded,
  onShowPerformance,
  onEdit,
  canPublish,
  onDelete,
  onStartEditingDate,
  onEditingDateValueChange,
  onReschedule,
  onCancelEditingDate,
}: PostListItemProps) {
  const isPublished = post.published && post.date <= today;
  const publicUrl = new URL(getBlogPostUrl(post.slug, post.category), BASE_URL).href;
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };
  const responseCounts = feedbackData?.feedback[post.slug];
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
              className="mt-2 block break-words font-medium leading-6 text-[var(--foreground)] hover:text-amber-600 hover:underline"
              title={isDraft ? "초안 미리보기" : "예약 글 미리보기"}
            >
              {post.title}
            </a>
          ) : (
            <a
              href={getBlogPostUrl(post.slug, post.category)}
              target="_blank"
              rel="noopener"
              className="mt-2 block break-words font-medium leading-6 text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
            >
              {post.title}
            </a>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <span>{isDraft ? "미정" : post.date}</span>
            {dDay !== null && <span className="font-medium text-amber-600">D-{dDay}</span>}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <MessageCircle size={14} aria-hidden="true" />
              {feedbackLoading ? "응답 조회 중…" : !feedbackData ? "피드백 조회 불가" : `해결 ${responseCounts?.solved ?? 0} · 미해결 ${responseCounts?.unresolved ?? 0}`}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2 border-t border-slate-200 pt-2 sm:justify-end sm:border-0 sm:pt-0">
          {isPublished && (
            <div className="flex w-32 max-w-full flex-col">
              <AdminActionButton
                type="button"
                tone="dark"
                onClick={copyPublicUrl}
                title={copyStatus === "copied" ? publicUrl : undefined}
                className="h-11 w-full whitespace-nowrap px-2 text-xs"
              >
                {copyStatus === "copied" ? (
                  <><Check size={14} aria-hidden="true" />복사 완료!</>
                ) : (
                  <><Copy size={14} aria-hidden="true" />환자용 링크 복사</>
                )}
              </AdminActionButton>
              <span role="status" className="sr-only">
                {copyStatus === "copied" && "환자용 링크를 복사했습니다."}
              </span>
            </div>
          )}
          <button type="button" onClick={() => onShowPerformance(post.slug)} aria-label={`${post.title} 성과 보기`} className="flex min-h-11 items-center gap-1 rounded px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-700"><BarChart3 size={14} />성과</button>
          {!expanded && (
            <button
              onClick={() => onEdit(post)}
              className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-blue-50 hover:text-[var(--color-primary)]"
              aria-label={`${post.title} ${isDraft ? "검토·발행" : "수정"}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {isDraft ? "검토·발행" : "수정"}
            </button>
          )}
          <button
            onClick={() => onToggleExpanded(post.slug)}
            aria-expanded={expanded}
            className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface)]"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "접기" : "상세"}
          </button>
        </div>
      </div>

      {isPublished && copyStatus === "failed" && (
        <div className="text-xs">
          <p role="alert">복사하지 못했습니다. 이 주소를 직접 복사해 주세요.</p>
          <input aria-label="환자용 공개 주소" readOnly value={publicUrl} onFocus={(event) => event.target.select()} className="mt-1 min-h-11 w-full rounded border border-[var(--border)] px-2" />
        </div>
      )}

      {expanded && (
        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
            <span className="break-all">슬러그: {post.slug}</span>
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
                  disabled={rescheduling}
                  aria-label={`${post.title} 발행일`}
                  aria-invalid={Boolean(rescheduleError)}
                  aria-describedby={rescheduleError ? `reschedule-error-${post.slug}` : undefined}
                  onChange={(event) => onEditingDateValueChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (rescheduling) return;
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onReschedule(post.slug, editingDateValue);
                    }
                    if (event.key === "Escape") onCancelEditingDate();
                  }}
                  autoFocus
                  className="min-h-11 min-w-0 rounded border border-blue-300 px-2 py-2 text-base focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  onClick={() => onReschedule(post.slug, editingDateValue)}
                  disabled={rescheduling || !editingDateValue}
                  className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                >
                  {rescheduling ? "저장 중..." : "저장"}
                </button>
                <button
                  onClick={onCancelEditingDate}
                  disabled={rescheduling}
                  className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface)]"
                >
                  취소
                </button>
                {rescheduleError && (
                  <div id={`reschedule-error-${post.slug}`} className="w-full">
                    <AdminNotice tone="error">발행일 변경 실패: {rescheduleError}</AdminNotice>
                  </div>
                )}
              </>
            ) : (
              <>
                {canPublish && dDay !== null && (
                  <button
                    onClick={() => onStartEditingDate(post)}
                    disabled={rescheduling}
                    className="min-h-11 rounded px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    발행일 변경
                  </button>
                )}
                <button
                  onClick={() => onEdit(post)}
                  className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-blue-50 hover:text-[var(--color-primary)]"
                  aria-label={`${post.title} ${isDraft && canPublish ? "검토·발행" : "수정"}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isDraft && canPublish ? "검토·발행" : "수정"}
                </button>
                {canPublish && <button
                  onClick={() => onDelete(post.slug)}
                  className="flex min-h-11 items-center gap-1 rounded px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label={`${post.title} 삭제`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
