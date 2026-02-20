"use client";

import { useState, useMemo } from "react";
import { BLOG_POSTS_META } from "@/lib/blog";
import { getBlogStats } from "@/lib/admin-data";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategoryValue } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";
import { useAdminApi } from "./useAdminApi";
import { DataTable } from "./DataTable";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface BlogLikesData {
  likes: Record<string, number>;
  totalLikes: number;
}

type SortKey = "newest" | "oldest" | "likes";
type StatusFilter = "all" | "published" | "scheduled";

// -------------------------------------------------------------
// BlogTab
// -------------------------------------------------------------

export function BlogTab() {
  const today = getTodayKST();
  const blogStats = getBlogStats();

  const { data: likesData, loading: likesLoading, error: likesError } =
    useAdminApi<BlogLikesData>("/api/admin/blog-likes");

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const filteredPosts = useMemo(() => {
    let posts = [...BLOG_POSTS_META];

    // Status filter
    if (statusFilter === "published") {
      posts = posts.filter((p) => p.date <= today);
    } else if (statusFilter === "scheduled") {
      posts = posts.filter((p) => p.date > today);
    }

    // Category filter
    if (categoryFilter !== "전체") {
      posts = posts.filter((p) => p.category === categoryFilter);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      posts = posts.filter((p) => p.title.toLowerCase().includes(q));
    }

    // Sort
    if (sortKey === "newest") {
      posts.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortKey === "oldest") {
      posts.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortKey === "likes") {
      posts.sort((a, b) => {
        const la = likesData?.likes[a.slug] ?? 0;
        const lb = likesData?.likes[b.slug] ?? 0;
        return lb - la;
      });
    }

    return posts;
  }, [searchQuery, categoryFilter, statusFilter, sortKey, today, likesData]);

  // Top 10 by likes
  const top10Posts = useMemo(() => {
    if (!likesData) return [];
    return [...BLOG_POSTS_META]
      .filter((p) => p.date <= today)
      .map((p) => ({ ...p, likeCount: likesData.likes[p.slug] ?? 0 }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10);
  }, [likesData, today]);

  const maxCategoryCount = Math.max(...blogStats.byCategory.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="전체 포스트" value={blogStats.total} />
        <StatCard label="발행" value={blogStats.published} color="text-green-600" />
        <StatCard label="예약" value={blogStats.scheduled} color="text-[var(--color-gold)]" />
      </div>

      {/* Search & Filter bar */}
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <input
            type="search"
            placeholder="제목 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-gray-50 px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-blue-100 min-w-[160px]"
          />

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-gray-50 px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            {BLOG_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-lg border border-[var(--border)] bg-gray-50 px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="all">전체 상태</option>
            <option value="published">발행</option>
            <option value="scheduled">예약</option>
          </select>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-[var(--border)] bg-gray-50 px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="likes">좋아요순</option>
          </select>
        </div>

        {/* Results count */}
        <p className="mt-3 text-xs text-[var(--muted)]">
          {filteredPosts.length}개 포스트
        </p>
      </section>

      {/* Post list */}
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">포스트 목록</h3>
        {filteredPosts.length === 0 ? (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-[var(--muted)]">
            검색 결과가 없습니다
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredPosts.map((post) => {
              const isPublished = post.date <= today;
              const likeCount = likesData?.likes[post.slug] ?? 0;
              const dDay = isPublished
                ? null
                : Math.ceil((new Date(post.date).getTime() - new Date(today).getTime()) / 86400000);
              const catColor = categoryColors[post.category as BlogCategoryValue] ?? "bg-gray-100 text-gray-600";

              return (
                <li
                  key={post.slug}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-gray-50 px-4 py-3 text-sm"
                >
                  {/* Status badge */}
                  <span
                    className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                      isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isPublished ? "발행" : "예약"}
                  </span>

                  {/* Title & meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="truncate font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                      >
                        {post.title}
                      </a>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${catColor}`}>
                        {post.category}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                      <span>{post.date}</span>
                      {!isPublished && dDay !== null && (
                        <span className="font-medium text-amber-600">D-{dDay}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <HeartIcon />
                        {likesLoading ? "..." : likeCount}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Category distribution */}
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
        <div className="space-y-2">
          {blogStats.byCategory.map((c) => (
            <div key={c.category} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-[var(--muted)]">{c.category}</span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className="flex h-full items-center rounded bg-[var(--color-primary)] px-2 text-xs font-medium text-white transition-all"
                    style={{ width: `${(c.count / maxCategoryCount) * 100}%`, minWidth: "2rem" }}
                  >
                    {c.count}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular posts TOP 10 */}
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--foreground)]">인기 포스트 TOP 10</h3>
          {likesData && (
            <span className="text-xs text-[var(--muted)]">
              전체 좋아요 {likesData.totalLikes.toLocaleString()}개
            </span>
          )}
        </div>

        {likesLoading && (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-sm text-[var(--muted)]">
            불러오는 중...
          </div>
        )}

        {likesError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {likesError}
          </div>
        )}

        {!likesLoading && !likesError && (
          <DataTable
            columns={[
              {
                key: "rank",
                label: "#",
                align: "center",
                render: (_row) => {
                  const idx = top10Posts.findIndex((p) => p.slug === _row.slug);
                  return <span className="font-semibold text-[var(--muted)]">{idx + 1}</span>;
                },
              },
              {
                key: "title",
                label: "제목",
                render: (row) => (
                  <a
                    href={`/blog/${row.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-[var(--color-primary)] hover:underline"
                  >
                    {String(row.title)}
                  </a>
                ),
              },
              {
                key: "category",
                label: "카테고리",
                render: (row) => {
                  const catColor = categoryColors[row.category as BlogCategoryValue] ?? "bg-gray-100 text-gray-600";
                  return (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${catColor}`}>
                      {String(row.category)}
                    </span>
                  );
                },
              },
              {
                key: "likeCount",
                label: "좋아요",
                align: "right",
                render: (row) => (
                  <span className="flex items-center justify-end gap-1 font-semibold text-rose-500">
                    <HeartIcon />
                    {Number(row.likeCount).toLocaleString()}
                  </span>
                ),
              },
            ]}
            rows={top10Posts as unknown as Record<string, unknown>[]}
            keyField="slug"
            emptyMessage="좋아요 데이터가 없습니다"
          />
        )}
      </section>
    </div>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

function StatCard({
  label,
  value,
  color = "text-[var(--foreground)]",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-rose-400"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
        clipRule="evenodd"
      />
    </svg>
  );
}
