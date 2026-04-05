"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check, Save } from "lucide-react";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategorySlug } from "@/lib/blog/types";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getBlogPostUrl, getCategoryLabel } from "@/lib/blog/category-slugs";
import { getTodayKST } from "@/lib/date";
import { useAdminApi, useAdminMutation } from "../useAdminApi";
import { DataTable } from "../DataTable";
import { CATEGORY_HEX, HeartIcon } from "./blog-helpers";
import type { AdminBlogPost, BlogLikesData } from "./blog-helpers";

// ---------------------------------------------------------------
// Recharts PieChart — loaded client-side only
// ---------------------------------------------------------------

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
// Publish Schedule Editor
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
      <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-2">
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
// StatsSubTab
// -------------------------------------------------------------

export function StatsSubTab() {
  const today = getTodayKST();

  const { data: postsData, loading: postsLoading, error: postsError } =
    useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const posts = postsData ?? EMPTY_POSTS;

  const { data: likesData, loading: likesLoading, error: likesError } =
    useAdminApi<BlogLikesData>("/api/admin/blog-likes");

  // Category distribution — all posts
  const byCategoryAll = useMemo(() => {
    return BLOG_CATEGORY_SLUGS.map((cat) => ({
      category: getCategoryLabel(cat),
      count: posts.filter((p) => p.category === cat).length,
    }));
  }, [posts]);

  // Category distribution — published only
  const byCategoryPublished = useMemo(() => {
    const published = posts.filter((p) => p.published && p.date <= today);
    return BLOG_CATEGORY_SLUGS.map((cat) => ({
      category: getCategoryLabel(cat),
      count: published.filter((p) => p.category === cat).length,
    }));
  }, [posts, today]);

  // Top 10 by likes
  const top10Posts = useMemo(() => {
    if (!likesData) return [];
    return [...posts]
      .filter((p) => p.published && p.date <= today)
      .map((p) => ({ ...p, likeCount: likesData.likes[p.slug] ?? 0 }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 10);
  }, [likesData, posts, today]);

  if (postsLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        불러오는 중...
      </div>
    );
  }

  if (postsError) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        {postsError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category distribution — side by side */}
      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-center text-sm font-medium text-[var(--muted)]">
              전체 ({posts.length}편)
            </p>
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
                render: (row) => {
                  const category = String(row.category) as BlogCategorySlug;
                  return (
                  <a
                    href={getBlogPostUrl(String(row.slug), category)}
                    target="_blank"
                    rel="noopener"
                    className="hover:text-[var(--color-primary)] hover:underline"
                  >
                    {String(row.title)}
                  </a>
                  );
                },
              },
              {
                key: "category",
                label: "카테고리",
                render: (row) => {
                  const category = String(row.category) as BlogCategorySlug;
                  const catColor =
                    categoryColors[category] ?? "bg-[var(--background)] text-[var(--muted)]";
                  return (
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${catColor}`}>
                      {getCategoryLabel(category)}
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
    </div>
  );
}
