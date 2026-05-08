"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getCategoryLabel } from "@/lib/blog/category-slugs";
import { getTodayKST } from "@/lib/date";
import { useAdminApi } from "../useAdminApi";
import { CATEGORY_HEX } from "./blog-helpers";
import type { AdminBlogPost } from "./blog-helpers";

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

export function StatsSubTab() {
  const today = getTodayKST();

  const { data: postsData, loading: postsLoading, error: postsError } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const posts = postsData ?? EMPTY_POSTS;

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
    </div>
  );
}
