"use client";

import { useState } from "react";
import {
  getBlogStats,
  getSiteConfigStatus,
  type BlogStats,
  type SiteConfigStatus,
} from "@/lib/admin-data";
import { ConfigRow } from "./ConfigRow";
import { StatCard } from "./StatCard";
import { MetricCard } from "./MetricCard";
import { useAdminApi } from "./useAdminApi";
import type { TabId } from "./AdminTabs";

// -------------------------------------------------------------
// 핵심 지표 요약 타입
// -------------------------------------------------------------

interface MetricValue {
  value: number;
  change: number | null;
}

interface AnalyticsSummary {
  summary: {
    sessions: MetricValue;
    users: MetricValue;
  };
}

interface SearchSummary {
  summary: {
    impressions: MetricValue;
    clicks: MetricValue;
  };
}

interface TrendCategory {
  category: string;
  overallTrend: "rising" | "falling" | "stable" | null;
  error: string | null;
}

interface TrendOverview {
  categories: TrendCategory[];
}

// -------------------------------------------------------------
// OverviewTab
// -------------------------------------------------------------

export function OverviewTab({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const blogStats = getBlogStats();
  const siteConfig = getSiteConfigStatus();

  return (
    <div className="space-y-6">
      <KeyMetricsSection onNavigate={onNavigate} />
      <BlogSection stats={blogStats} />
      <SiteConfigSection config={siteConfig} />
    </div>
  );
}

// -------------------------------------------------------------
// 핵심 지표 요약
// -------------------------------------------------------------

function KeyMetricsSection({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const { data: traffic, loading: tLoading, error: tError } =
    useAdminApi<AnalyticsSummary>("/api/admin/analytics?period=7d");
  const { data: search, loading: sLoading, error: sError } =
    useAdminApi<SearchSummary>("/api/admin/search-console?period=7d");
  const { data: trend, loading: dLoading, error: dError } =
    useAdminApi<TrendOverview>("/api/admin/naver-datalab/overview?period=7d");

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        핵심 지표 <span className="text-sm font-normal text-[var(--muted)]">최근 7일</span>
      </h3>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* 트래픽 */}
        <MetricGroup
          title="트래픽"
          onClick={() => onNavigate?.("traffic")}
          loading={tLoading}
          error={tError}
        >
          {traffic && (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="세션"
                value={traffic.summary.sessions.value.toLocaleString("ko-KR")}
                change={traffic.summary.sessions.change}
              />
              <MetricCard
                label="사용자"
                value={traffic.summary.users.value.toLocaleString("ko-KR")}
                change={traffic.summary.users.change}
              />
            </div>
          )}
        </MetricGroup>

        {/* 검색 */}
        <MetricGroup
          title="검색"
          onClick={() => onNavigate?.("search")}
          loading={sLoading}
          error={sError}
        >
          {search && (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="노출수"
                value={search.summary.impressions.value.toLocaleString("ko-KR")}
                change={search.summary.impressions.change}
              />
              <MetricCard
                label="클릭수"
                value={search.summary.clicks.value.toLocaleString("ko-KR")}
                change={search.summary.clicks.change}
              />
            </div>
          )}
        </MetricGroup>

        {/* 트렌드 */}
        <MetricGroup
          title="트렌드"
          onClick={() => onNavigate?.("trend")}
          loading={dLoading}
          error={dError}
        >
          {trend && <TrendBadges categories={trend.categories} />}
        </MetricGroup>
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// 지표 그룹 래퍼
// -------------------------------------------------------------

function MetricGroup({
  title,
  onClick,
  loading,
  error,
  children,
}: {
  title: string;
  onClick: () => void;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-[var(--border)] p-3 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--background)]"
    >
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">{title}</p>
      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg bg-[var(--background)] p-3 text-center">
              <div className="mx-auto h-8 w-16 animate-pulse rounded bg-[var(--border)]" />
              <div className="mx-auto mt-2 h-3 w-12 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="py-3 text-center text-xs text-red-500">{error}</p>
      ) : (
        children
      )}
    </button>
  );
}

// -------------------------------------------------------------
// 트렌드 배지
// -------------------------------------------------------------

function TrendBadges({ categories }: { categories: TrendCategory[] }) {
  const valid = categories.filter((c) => c.overallTrend && !c.error);
  const rising = valid.filter((c) => c.overallTrend === "rising").length;
  const falling = valid.filter((c) => c.overallTrend === "falling").length;
  const stable = valid.filter((c) => c.overallTrend === "stable").length;

  return (
    <div className="flex items-center justify-center gap-3 rounded-lg bg-[var(--background)] p-3">
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        상승 {rising}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        하락 {falling}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        안정 {stable}
      </span>
    </div>
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
                className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-2 text-sm"
              >
                <span className="truncate text-[var(--foreground)]">{p.title}</span>
                <span className="ml-2 shrink-0 text-xs text-[var(--muted)]">{p.date}</span>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              onClick={() => setShowAllScheduled((prev) => !prev)}
              className="mt-2 w-full rounded-lg border border-[var(--border)] py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
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

