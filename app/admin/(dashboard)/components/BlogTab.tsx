"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Pencil, Trash2, Plus, Calendar, X, Save, Loader2, Check } from "lucide-react";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategoryValue } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";
import { useAdminApi, useAdminMutation } from "./useAdminApi";
import { DataTable } from "./DataTable";
import { StatCard } from "./StatCard";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { AdminErrorState } from "./AdminErrorState";
import BlogEditor from "./BlogEditor";
import type { BlogEditorData } from "./BlogEditor";

// ---------------------------------------------------------------
// Category hex colors for Recharts (maps from Tailwind class names)
// ---------------------------------------------------------------

const CATEGORY_HEX: Record<string, string> = {
  "예방·구강관리": "#1D4ED8",
  "보존치료":     "#15803D",
  "보철치료":     "#7E22CE",
  "임플란트":     "#BE123C",
  "치아교정":     "#A67B1E",
  "소아치료":     "#C2410C",
  "구강건강상식": "#0F766E",
};

// ---------------------------------------------------------------
// Recharts PieChart — loaded client-side only
// ---------------------------------------------------------------

type CategoryData = { category: string; count: number };

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
                  const { cx: cxVal, cy: cyVal, midAngle, innerRadius: ir, outerRadius: or, percent } = props as unknown as { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number };
                  const RADIAN = Math.PI / 180;
                  const radius = ir + (or - ir) * 0.5;
                  const x = cxVal + radius * Math.cos(-midAngle * RADIAN);
                  const y = cyVal + radius * Math.sin(-midAngle * RADIAN);
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
              <mod.Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={10}
              />
            </mod.PieChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface AdminBlogPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  dateModified?: string;
  readTime: string;
  published: boolean;
}

interface BlogLikesData {
  likes: Record<string, number>;
  totalLikes: number;
}

type SortKey = "newest" | "oldest" | "likes";
type StatusFilter = "all" | "published" | "scheduled" | "draft";

// -------------------------------------------------------------
// BlogTab
// -------------------------------------------------------------

interface BlogTabProps {
  editSlug?: string | null;
}

export function BlogTab({ editSlug }: BlogTabProps) {
  const today = getTodayKST();

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");

  const posts = useMemo(() => postsData ?? [], [postsData]);

  const { data: likesData, loading: likesLoading, error: likesError } =
    useAdminApi<BlogLikesData>("/api/admin/blog-likes");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<string>("전체");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Schedule data for publish date recommendation
  const { data: scheduleData } = useAdminApi<{ publishDays: number[] }>(
    "/api/admin/site-config/schedule",
  );

  // CRUD state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);
  const [publishingSlug, setPublishingSlug] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState("");
  const [publishMode, setPublishMode] = useState<"immediate" | "schedule" | "custom">("schedule");
  const [scheduledDate, setScheduledDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const { mutate } = useAdminMutation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 딥링크: ?edit=slug 파라미터로 특정 포스트 편집 모드 자동 진입
  const deepLinkProcessed = useRef(false);
  useEffect(() => {
    if (!editSlug || postsLoading || deepLinkProcessed.current) return;
    const target = posts.find((p) => p.slug === editSlug);
    if (target) {
      deepLinkProcessed.current = true;
      const timer = setTimeout(() => {
        setEditingPost(target);
        setEditorOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editSlug, posts, postsLoading]);

  // Computed blog stats from API data
  const blogStats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.published && p.date <= today).length;
    const scheduled = posts.filter((p) => p.published && p.date > today).length;
    const draft = posts.filter((p) => !p.published).length;

    const categories = BLOG_CATEGORIES.filter((c) => c !== "전체");
    const byCategory = categories.map((cat) => ({
      category: cat,
      count: posts.filter((p) => p.category === cat).length,
    }));

    return { total, published, scheduled, draft, byCategory };
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
    if (categoryFilter !== "전체") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Text search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.trim().toLowerCase();
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(q));
    }

    // Sort
    if (sortKey === "newest") {
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

    return filtered;
  }, [posts, debouncedQuery, categoryFilter, statusFilter, sortKey, today, likesData]);

  // Top 10 by likes
  const top10Posts = useMemo(() => {
    if (!likesData) return [];
    return [...posts]
      .filter((p) => p.published && p.date <= today)
      .map((p) => ({ ...p, likeCount: likesData.likes[p.slug] ?? 0 }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10);
  }, [likesData, posts, today]);

  // CRUD handlers
  const handleCreate = () => {
    setEditingPost(null);
    setEditorOpen(true);
  };

  const handleEdit = (post: AdminBlogPost) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("이 포스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const { error } = await mutate(`/api/admin/blog-posts/${slug}`, "DELETE");
    if (!error) refetchPosts();
  };

  // Publish flow
  const getNextPublishDate = (): string => {
    const days = scheduleData?.publishDays ?? [1, 3, 5];
    if (days.length === 0) {
      // No schedule — default to tomorrow
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    }
    // Collect dates already scheduled (published posts with future dates)
    const scheduledDates = new Set(
      posts.filter((p) => p.published && p.date > today).map((p) => p.date),
    );
    // Find next available date starting from today
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      const iso = d.toISOString().slice(0, 10);
      const dow = d.getDay(); // 0=Sun
      if (days.includes(dow) && !scheduledDates.has(iso) && iso >= today) {
        return iso;
      }
      d.setDate(d.getDate() + 1);
    }
    // Fallback: tomorrow
    const fb = new Date();
    fb.setDate(fb.getDate() + 1);
    return fb.toISOString().slice(0, 10);
  };

  const handlePublishOpen = (slug: string) => {
    const recommended = getNextPublishDate();
    setPublishingSlug(slug);
    setPublishMode("schedule");
    setPublishDate(recommended);
    setScheduledDate(recommended);
  };

  const handlePublishConfirm = async () => {
    if (!publishingSlug || !publishDate) return;
    setPublishing(true);
    const { error } = await mutate(
      `/api/admin/blog-posts/${publishingSlug}`,
      "PUT",
      { published: true, date: publishDate },
    );
    setPublishing(false);
    if (!error) {
      setPublishingSlug(null);
      refetchPosts();
    }
  };

  const handleEditorSave = async (data: BlogEditorData): Promise<{ error: string | null }> => {
    if (editingPost) {
      const { error } = await mutate(`/api/admin/blog-posts/${editingPost.slug}`, "PUT", data);
      if (!error) {
        setEditorOpen(false);
        refetchPosts();
      }
      return { error };
    } else {
      const { error } = await mutate("/api/admin/blog-posts", "POST", data);
      if (!error) {
        setEditorOpen(false);
        refetchPosts();
      }
      return { error };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--foreground)]">블로그 관리</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          새 포스트 작성
        </button>
      </div>

      {/* Posts loading / error */}
      {postsLoading && <AdminLoadingSkeleton variant="table" />}
      {postsError && (
        <AdminErrorState message={postsError} onRetry={refetchPosts} />
      )}

      {!postsLoading && !postsError && (
        <>
          {/* Summary cards (clickable filters) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="전체 포스트" value={blogStats.total} variant="elevated" onClick={() => setStatusFilter("all")} active={statusFilter === "all"} />
            <StatCard label="발행" value={blogStats.published} color="text-green-600" variant="elevated" onClick={() => setStatusFilter("published")} active={statusFilter === "published"} />
            <StatCard label="예약" value={blogStats.scheduled} color="text-[var(--color-gold)]" variant="elevated" onClick={() => setStatusFilter("scheduled")} active={statusFilter === "scheduled"} />
            <StatCard label="초안" value={blogStats.draft} color="text-[var(--muted)]" variant="elevated" onClick={() => setStatusFilter("draft")} active={statusFilter === "draft"} />
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
                className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15 min-w-[160px]"
              />

              {/* Category dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                {BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
                    categoryColors[post.category as BlogCategoryValue] ?? "bg-[var(--background)] text-[var(--muted)]";

                  const statusLabel = !post.published
                    ? "임시"
                    : isPublished
                    ? "발행"
                    : "예약";
                  const statusClass = !post.published
                    ? "bg-[var(--background)] text-[var(--muted)]"
                    : isPublished
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700";

                  return (
                    <li
                      key={post.slug}
                      className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                    >
                      {/* Row 1: Category + Title + Status */}
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${catColor}`}>
                          {post.category}
                        </span>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener"
                          className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                        >
                          {post.title}
                        </a>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Row 2: Date/meta + CRUD buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                          <span>{post.date}</span>
                          {dDay !== null && (
                            <span className="font-medium text-amber-600">D-{dDay}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <HeartIcon />
                            {likesLoading ? "..." : likeCount}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!post.published && (
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
            <CategoryPieChart data={blogStats.byCategory} />
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
              <div className="rounded-lg bg-[var(--background)] px-4 py-8 text-center text-sm text-[var(--muted)]">
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
                      const catColor =
                        categoryColors[row.category as BlogCategoryValue] ?? "bg-[var(--background)] text-[var(--muted)]";
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

          {/* Publish schedule editor */}
          <ScheduleEditor />
        </>
      )}

      {/* Publish popup */}
      {publishingSlug && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="발행"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPublishingSlug(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-[var(--surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--foreground)]">발행</h3>
              <button
                onClick={() => setPublishingSlug(null)}
                className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <fieldset className="mb-4 space-y-2">
              <legend className="sr-only">발행 방식 선택</legend>

              {/* 스케줄에 맞춰 발행 (기본) */}
              <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "schedule"
                  ? "border-[var(--color-primary)] bg-blue-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="schedule"
                  checked={publishMode === "schedule"}
                  onChange={() => {
                    setPublishMode("schedule");
                    setPublishDate(scheduledDate);
                  }}
                  className="accent-[var(--color-primary)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--foreground)]">스케줄에 맞춰 발행</span>
                  <p className="text-xs text-[var(--muted)]">추천 날짜: {scheduledDate}</p>
                </div>
              </label>

              {/* 즉시 발행 */}
              <label className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "immediate"
                  ? "border-green-500 bg-green-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="immediate"
                  checked={publishMode === "immediate"}
                  onChange={() => {
                    setPublishMode("immediate");
                    setPublishDate(today);
                  }}
                  className="accent-green-600"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--foreground)]">즉시 발행</span>
                  <p className="text-xs text-[var(--muted)]">오늘 ({today}) 바로 공개됩니다</p>
                </div>
              </label>

              {/* 날짜 직접 선택 */}
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                publishMode === "custom"
                  ? "border-[var(--color-gold)] bg-amber-50"
                  : "border-[var(--border)] hover:border-[var(--muted-light)]"
              }`}>
                <input
                  type="radio"
                  name="publishMode"
                  value="custom"
                  checked={publishMode === "custom"}
                  onChange={() => setPublishMode("custom")}
                  className="mt-0.5 accent-[var(--color-gold)]"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">날짜 직접 선택</span>
                  {publishMode === "custom" && (
                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]/15"
                    />
                  )}
                </div>
              </label>
            </fieldset>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPublishingSlug(null)}
                disabled={publishing}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handlePublishConfirm}
                disabled={publishing || !publishDate}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors ${
                  publishMode === "immediate"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]"
                }`}
              >
                {publishMode === "immediate" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {publishing
                  ? "처리 중..."
                  : publishMode === "immediate"
                  ? "즉시 발행"
                  : "발행 예약"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog editor modal */}
      {editorOpen && (
        <BlogEditor
          mode={editingPost ? "edit" : "create"}
          initialData={
            editingPost
              ? {
                  slug: editingPost.slug,
                  title: editingPost.title,
                  subtitle: editingPost.subtitle,
                  excerpt: editingPost.excerpt,
                  category: editingPost.category,
                  tags: editingPost.tags,
                  date: editingPost.date,
                  content: [], // fetched inside BlogEditor via API
                  published: editingPost.published,
                }
              : undefined
          }
          onSave={handleEditorSave}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Publish Schedule Editor (moved from SettingsTab)
// -------------------------------------------------------------

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function ScheduleEditor() {
  const { data, loading, refetch } = useAdminApi<{ publishDays: number[] }>(
    "/api/admin/site-config/schedule",
  );
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<number[] | null>(null);
  const [saved, setSaved] = useState(false);

  const days = formEdits ?? data?.publishDays ?? [1, 3, 5];

  const toggleDay = (day: number) => {
    setFormEdits((prev) => {
      const current = prev ?? data?.publishDays ?? [1, 3, 5];
      if (current.includes(day)) {
        if (current.length <= 1) return current;
        return current.filter((d) => d !== day);
      }
      return [...current, day].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    const { error } = await mutate(
      "/api/admin/site-config/schedule",
      "PUT",
      { publishDays: days },
    );
    if (!error) {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>불러오는 중...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">발행 스케줄</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            블로그 포스트 발행 요일을 설정합니다. 발행 시 추천 날짜 계산에 사용됩니다.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {DAY_LABELS.map((label, idx) => {
          const selected = days.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx)}
              className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors sm:w-10 ${
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        선택된 요일: {days.length === 0 ? "없음" : days.map((d) => DAY_LABELS[d]).join(", ")} (주 {days.length}회)
      </p>
    </section>
  );
}

// -------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------

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
