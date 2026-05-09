"use client";

import dynamic from "next/dynamic";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { getCategoryLabel } from "@/lib/blog/category-slugs";
import type { AdminBlogPost } from "./blog-helpers";
import { CATEGORY_HEX } from "./blog-helpers";

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
                {pieData.map((entry) => (
                  <mod.Cell key={entry.name} fill={entry.fill} />
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

export function CategoryDistributionPanel({
  posts,
  today,
}: {
  posts: AdminBlogPost[];
  today: string;
}) {
  const byCategoryAll = BLOG_CATEGORY_SLUGS.map((cat) => ({
    category: getCategoryLabel(cat),
    count: posts.filter((p) => p.category === cat).length,
  }));
  const publishedPosts = posts.filter((p) => p.published && p.date <= today);
  const byCategoryPublished = BLOG_CATEGORY_SLUGS.map((cat) => ({
    category: getCategoryLabel(cat),
    count: publishedPosts.filter((p) => p.category === cat).length,
  }));

  return (
    <section className="rounded-xl bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-[var(--foreground)]">카테고리별 분포</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          블로그 자산이 어떤 주제에 몰려 있는지 확인합니다.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-center text-sm font-medium text-[var(--muted)]">전체 ({posts.length}편)</p>
          <CategoryPieChart data={byCategoryAll} />
        </div>
        <div>
          <p className="mb-2 text-center text-sm font-medium text-[var(--muted)]">
            발행 ({publishedPosts.length}편)
          </p>
          <CategoryPieChart data={byCategoryPublished} />
        </div>
      </div>
    </section>
  );
}
