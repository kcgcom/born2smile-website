"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  getImprovementStats,
  getBlogStats,
  getSiteConfigStatus,
  IMPROVEMENT_ITEMS,
  type ImprovementStats,
  type BlogStats,
  type SiteConfigStatus,
} from "@/lib/admin-data";
import { ConfigRow } from "./ConfigRow";
import { StatCard } from "./StatCard";

// ---------------------------------------------------------------
// Category hex colors for Recharts
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
          <mod.ResponsiveContainer width="100%" height={240}>
            <mod.PieChart>
              <mod.Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <mod.Cell key={index} fill={entry.fill} />
                ))}
              </mod.Pie>
              <mod.Tooltip
                formatter={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ((value: number, name: string) => [`${value}편`, name]) as any
                }
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

// -------------------------------------------------------------
// OverviewTab
// -------------------------------------------------------------

export function OverviewTab() {
  const improvementStats = getImprovementStats();
  const blogStats = getBlogStats();
  const siteConfig = getSiteConfigStatus();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ImprovementSection stats={improvementStats} />
      <BlogSection stats={blogStats} />
      <SiteConfigSection config={siteConfig} />
    </div>
  );
}

// -------------------------------------------------------------
// 개선 항목 현황
// -------------------------------------------------------------

function ImprovementSection({ stats }: { stats: ImprovementStats }) {
  const pct = Math.round((stats.done / stats.total) * 100);
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);
  const ownerItems = IMPROVEMENT_ITEMS.filter((i) => i.status === "owner-decision");
  const pendingItems = IMPROVEMENT_ITEMS.filter((i) => i.status === "pending");

  const togglePriority = (priority: string) => {
    setExpandedPriority((prev) => (prev === priority ? null : priority));
  };

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        개선 항목 현황
      </h3>

      {/* 전체 진행률 */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">전체 진행률</span>
          <span className="font-semibold text-[var(--foreground)]">
            {stats.done}/{stats.total} ({pct}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 우선순위별 완료율 — 클릭 시 항목 목록 토글 */}
      <div className="mb-4 space-y-1">
        {stats.byPriority.map((bp) => {
          const isExpanded = expandedPriority === bp.priority;
          const items = IMPROVEMENT_ITEMS.filter((i) => i.priority === bp.priority);
          return (
            <div key={bp.priority}>
              <button
                onClick={() => togglePriority(bp.priority)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-gray-50"
              >
                <PriorityBadge priority={bp.priority} />
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                      style={{
                        width: bp.total > 0 ? `${(bp.done / bp.total) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-[var(--muted)]">
                  {bp.done}/{bp.total}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExpanded && (
                <ul className="mb-2 ml-1 mt-1 space-y-1.5 border-l-2 border-gray-100 pl-3">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <StatusIcon status={item.status} />
                      <div className="min-w-0">
                        <p className={`font-medium ${item.status === "done" ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* 미완료 항목 요약 */}
      {pendingItems.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">
            미완료 ({pendingItems.length}건)
          </h4>
          <ul className="space-y-1.5">
            {pendingItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                <PriorityBadge priority={item.priority} />
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 오너 결정 필요 항목 */}
      {ownerItems.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-gold-dark)]">
            오너 결정 필요 ({ownerItems.length}건)
          </h4>
          <ul className="space-y-1.5">
            {ownerItems.map((item) => (
              <li key={item.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "owner-decision") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4h.01" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-block w-20 rounded px-2 py-0.5 text-center text-xs font-semibold ${styles[priority] ?? styles.LOW}`}
    >
      {priority}
    </span>
  );
}

// -------------------------------------------------------------
// 블로그 포스트 현황
// -------------------------------------------------------------

function BlogSection({ stats }: { stats: BlogStats }) {
  const SCHEDULED_PREVIEW = 5;
  const [showAllScheduled, setShowAllScheduled] = useState(false);
  const visibleScheduled = showAllScheduled
    ? stats.scheduledPosts
    : stats.scheduledPosts.slice(0, SCHEDULED_PREVIEW);
  const hasMore = stats.scheduledPosts.length > SCHEDULED_PREVIEW;

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        블로그 포스트 현황
      </h3>

      {/* 요약 수치 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="전체" value={stats.total} />
        <StatCard label="발행" value={stats.published} color="text-green-600" />
        <StatCard label="예약" value={stats.scheduled} color="text-[var(--color-gold)]" />
      </div>

      {/* 카테고리별 분포 */}
      <div className="mb-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리별 분포
        </h4>
        <CategoryPieChart data={stats.byCategory} />
      </div>

      {/* 예약 발행 대기 */}
      {stats.scheduledPosts.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
            예약 발행 대기 ({stats.scheduledPosts.length}건)
          </h4>
          <ul className="space-y-1.5">
            {visibleScheduled.map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="truncate text-[var(--foreground)]">{p.title}</span>
                <span className="ml-2 shrink-0 text-xs text-[var(--muted)]">{p.date}</span>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              onClick={() => setShowAllScheduled((prev) => !prev)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-gray-50 hover:text-[var(--foreground)]"
            >
              {showAllScheduled
                ? "접기"
                : `더보기 (+${stats.scheduledPosts.length - SCHEDULED_PREVIEW}건)`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// -------------------------------------------------------------
// 사이트 설정 상태
// -------------------------------------------------------------

function SiteConfigSection({ config }: { config: SiteConfigStatus }) {
  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm lg:col-span-2">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        사이트 설정 상태
      </h3>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* SNS 링크 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">SNS 링크</h4>
          <ul className="space-y-2">
            {config.snsLinks.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* Firebase */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Firebase</h4>
          <ul className="space-y-2">
            {config.firebase.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* 환경변수 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">환경변수</h4>
          <ul className="space-y-2">
            {config.env.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

