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

// -------------------------------------------------------------
// OverviewTab
// -------------------------------------------------------------

export function OverviewTab() {
  const blogStats = getBlogStats();
  const siteConfig = getSiteConfigStatus();

  return (
    <div className="space-y-6">
      <BlogSection stats={blogStats} />
      <SiteConfigSection config={siteConfig} />
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

