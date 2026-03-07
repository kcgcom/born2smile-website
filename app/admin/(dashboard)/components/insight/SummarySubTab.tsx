"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Lightbulb } from "lucide-react";
import { useAdminApi } from "../useAdminApi";
import { MetricCard } from "../MetricCard";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { CategoryBadge, GapScoreBadge, PriorityBadge, calcTotalVolume, formatDuration } from "./shared";
import type { MetricValue } from "./shared";

// ---------------------------------------------------------------
// Types (summary에 필요한 필드만)
// ---------------------------------------------------------------

interface TrafficSummary {
  summary: {
    sessions: MetricValue;
    users: MetricValue;
    pageviews: MetricValue;
    avgDuration: MetricValue;
    bounceRate: MetricValue;
  };
}

interface SearchSummary {
  summary: {
    impressions: MetricValue;
    clicks: MetricValue;
    ctr: MetricValue;
    position: MetricValue;
  };
}

interface ContentGapItem {
  category: string;
  slug: string;
  subGroup: string;
  gapScore: number;
  monthlyVolume: number | null;
  relatedKeywords?: Array<{ keyword: string; volume: number }>;
  directKeywords?: Array<{ keyword: string; volume: number }>;
  existingPostCount: number;
}

interface TopicSuggestionItem {
  rank: number;
  category: string;
  slug: string;
  suggestedTitle: string;
  priority: "high" | "medium" | "low";
  keywords: string[];
}

interface OverviewData {
  contentGap: ContentGapItem[];
  suggestions: TopicSuggestionItem[];
}

// ---------------------------------------------------------------
// Skeleton for individual sections
// ---------------------------------------------------------------

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--border)]" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function SummarySubTab() {
  const router = useRouter();

  const traffic = useAdminApi<TrafficSummary>("/api/admin/analytics?period=7d");
  const search = useAdminApi<SearchSummary>("/api/admin/search-console?period=28d");
  const overview = useAdminApi<OverviewData>("/api/admin/naver-datalab/overview");

  const navigateToSub = (sub: string) => {
    router.replace(`/admin?tab=insight&sub=${sub}`);
  };

  const handleNewPost = (slug: string) => {
    router.push(`/admin?tab=blog&newCategory=${slug}`);
  };

  // ── Derived data ─────────────────────────────────────────────
  const highGapCount = overview.data
    ? overview.data.contentGap.filter((g) => g.gapScore >= 70).length
    : 0;

  const topGaps = overview.data
    ? [...overview.data.contentGap]
        .sort((a, b) => b.gapScore - a.gapScore)
        .slice(0, 5)
    : [];

  const topSuggestions = overview.data
    ? overview.data.suggestions.slice(0, 3)
    : [];

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["ga4", "searchConsole", "naverSearchAd"]} />

      {/* ── Section 1: Traffic KPIs (GA4 7d) ──────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          트래픽 (최근 7일)
        </h2>
        {traffic.loading && <AdminLoadingSkeleton variant="metrics" />}
        {traffic.error && <AdminErrorState message={traffic.error} onRetry={traffic.refetch} />}
        {!traffic.loading && !traffic.error && traffic.data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              label="세션"
              value={traffic.data.summary.sessions.value.toLocaleString("ko-KR")}
              change={traffic.data.summary.sessions.change}
            />
            <MetricCard
              label="사용자"
              value={traffic.data.summary.users.value.toLocaleString("ko-KR")}
              change={traffic.data.summary.users.change}
            />
            <MetricCard
              label="페이지뷰"
              value={traffic.data.summary.pageviews.value.toLocaleString("ko-KR")}
              change={traffic.data.summary.pageviews.change}
            />
            <MetricCard
              label="평균 체류"
              value={formatDuration(traffic.data.summary.avgDuration.value)}
              change={traffic.data.summary.avgDuration.change}
            />
            <MetricCard
              label="이탈률"
              value={`${traffic.data.summary.bounceRate.value.toFixed(1)}%`}
              change={traffic.data.summary.bounceRate.change}
              invertChange={true}
            />
          </div>
        )}
      </section>

      {/* ── Section 2: Search KPIs (SC 28d) ───────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          검색 성과 (최근 28일)
        </h2>
        {search.loading && <AdminLoadingSkeleton variant="metrics" />}
        {search.error && <AdminErrorState message={search.error} onRetry={search.refetch} />}
        {!search.loading && !search.error && search.data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="총 노출"
              value={search.data.summary.impressions.value.toLocaleString("ko-KR")}
              change={search.data.summary.impressions.change}
            />
            <MetricCard
              label="총 클릭"
              value={search.data.summary.clicks.value.toLocaleString("ko-KR")}
              change={search.data.summary.clicks.change}
            />
            <MetricCard
              label="평균 CTR"
              value={`${search.data.summary.ctr.value}%`}
              change={search.data.summary.ctr.change}
            />
            <MetricCard
              label="평균 순위"
              value={search.data.summary.position.value}
              change={search.data.summary.position.change}
              invertChange={true}
            />
          </div>
        )}
      </section>

      {/* ── Section 3: Action alerts ──────────────────────── */}
      {!overview.loading && !overview.error && highGapCount > 0 && (
        <section>
          <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800">
                HIGH 갭 {highGapCount}건 발견
              </p>
              <p className="text-xs text-yellow-700">
                검색 수요가 높지만 콘텐츠가 부족한 영역이 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateToSub("strategy")}
              className="shrink-0 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700 transition-colors"
            >
              자세히 <ChevronRight className="inline h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ── Section 4: Content gap TOP 5 ──────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          콘텐츠 갭 TOP 5
        </h2>
        {overview.loading && <SectionSkeleton rows={5} />}
        {overview.error && <AdminErrorState message={overview.error} onRetry={overview.refetch} />}
        {!overview.loading && !overview.error && overview.data && (
          topGaps.length > 0 ? (
            <div className="space-y-2">
              {topGaps.map((gap) => {
                const totalVolume = gap.monthlyVolume != null ? calcTotalVolume(gap) : null;
                return (
                  <div
                    key={`${gap.slug}-${gap.subGroup}`}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                  >
                    <CategoryBadge category={gap.category} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                      {gap.subGroup}
                    </span>
                    {totalVolume != null && (
                      <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">
                        {totalVolume.toLocaleString("ko-KR")}/월
                      </span>
                    )}
                    <GapScoreBadge score={gap.gapScore} />
                    <button
                      type="button"
                      onClick={() => handleNewPost(gap.slug)}
                      className="shrink-0 rounded bg-[var(--color-primary)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                    >
                      새 포스트
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--muted)]">
              콘텐츠 갭 데이터가 없습니다
            </p>
          )
        )}
      </section>

      {/* ── Section 5: Topic suggestions TOP 3 ────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          <Lightbulb className="mr-1 inline h-4 w-4 text-yellow-500" aria-hidden="true" />
          추천 주제 TOP 3
        </h2>
        {overview.loading && <SectionSkeleton rows={3} />}
        {overview.error == null && !overview.loading && overview.data && (
          topSuggestions.length > 0 ? (
            <div className="space-y-2">
              {topSuggestions.map((item) => (
                <div
                  key={`${item.rank}-${item.slug}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--muted)]">
                    {item.rank}
                  </span>
                  <PriorityBadge priority={item.priority} />
                  <CategoryBadge category={item.category} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                    {item.suggestedTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNewPost(item.slug)}
                    className="shrink-0 rounded bg-[var(--color-primary)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    새 포스트 작성
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--muted)]">
              추천 주제가 없습니다
            </p>
          )
        )}
      </section>
    </div>
  );
}
