"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategorySlug } from "@/lib/blog/types";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getBlogPostUrl, getCategoryLabel } from "@/lib/blog/category-slugs";
import { getTodayKST } from "@/lib/date";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { useAdminApi } from "../useAdminApi";
import { DataTable } from "../DataTable";
import { CATEGORY_HEX, HeartIcon } from "./blog-helpers";
import type { AdminBlogPost, BlogLikesData } from "./blog-helpers";

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

export function ContentStatsPanel({
  embedded = false,
  initialPosts,
  initialLikesData,
  initialLikesLoading = false,
  initialLikesError = null,
}: {
  embedded?: boolean;
  initialPosts?: AdminBlogPost[];
  initialLikesData?: BlogLikesData | null;
  initialLikesLoading?: boolean;
  initialLikesError?: string | null;
}) {
  const today = getTodayKST();

  const shouldFetch = !embedded;
  const { data: postsData, loading: postsLoading, error: postsError } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts", shouldFetch);
  const posts = embedded ? (initialPosts ?? EMPTY_POSTS) : (postsData ?? EMPTY_POSTS);

  const {
    data: fetchedLikesData,
    loading: fetchedLikesLoading,
    error: fetchedLikesError,
  } = useAdminApi<BlogLikesData>("/api/admin/blog-likes", shouldFetch);
  const likesData = embedded ? (initialLikesData ?? null) : fetchedLikesData;
  const likesLoading = embedded ? initialLikesLoading : fetchedLikesLoading;
  const likesError = embedded ? initialLikesError : fetchedLikesError;

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
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        성과 요약을 불러오는 중...
      </div>
    );
  }

  if (postsError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
        {postsError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <AdminSurface tone="white" className="rounded-3xl p-5">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">콘텐츠 성과 요약</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              카테고리 분포와 좋아요 반응을 빠르게 확인합니다.
            </p>
          </div>
        </AdminSurface>
      )}

      <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
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
      </section>

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
                render: (row) => {
                  const idx = top10Posts.findIndex((p) => p.slug === row.slug);
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
                  const catColor = categoryColors[category] ?? "bg-[var(--background)] text-[var(--muted)]";
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
    </div>
  );
}

export function StatsSubTab() {
  return <ContentStatsPanel />;
}
