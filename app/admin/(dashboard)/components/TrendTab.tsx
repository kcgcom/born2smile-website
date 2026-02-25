"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Minus, X, ChevronRight, AlertCircle } from "lucide-react";
import { useAdminApi } from "./useAdminApi";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { AdminErrorState } from "./AdminErrorState";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategoryValue } from "@/lib/blog/types";

// ---------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------

interface OverviewCategory {
  category: string;
  slug: string;
  overallTrend?: "rising" | "falling" | "stable";
  changeRate?: number;
  topSubGroup?: string;
  subGroupCount?: number;
  risingCount?: number;
  fallingCount?: number;
  stableCount?: number;
  monthlyTotalVolume?: number | null;
  error: string | null;
}

interface ContentGapItem {
  category: string;
  slug: string;
  subGroup: string;
  keywords: string[];
  trend: "rising" | "falling" | "stable";
  changeRate: number;
  currentAvg: number;
  existingPostCount: number;
  gapScore: number;
  monthlyVolume: number | null;
  volumeSource: "searchad" | "datalab-fallback";
  isEstimated: boolean;
  relatedKeywords?: Array<{ keyword: string; volume: number }>;
}

interface TopicSuggestionItem {
  rank: number;
  category: string;
  slug: string;
  suggestedTitle: string;
  reasoning: string;
  keywords: string[];
  trend: "rising" | "falling" | "stable";
  gapScore: number;
  priority: "high" | "medium" | "low";
}

interface OverviewData {
  period: { start: string; end: string };
  categories: OverviewCategory[];
  contentGap: ContentGapItem[];
  suggestions: TopicSuggestionItem[];
  volumeSource: "searchad" | "datalab-fallback";
  volumeCoverage: number | null;
}

interface SubGroupDetail {
  name: string;
  trend: "rising" | "falling" | "stable";
  changeRate: number;
  currentAvg: number;
  data: Array<{ period: string; ratio: number }>;
}

interface CategoryDetailData {
  category: string;
  slug: string;
  period: { start: string; end: string };
  timeUnit: string;
  subGroups: SubGroupDetail[];
}

// ---------------------------------------------------------------
// Sub-group line chart — loaded client-side only
// ---------------------------------------------------------------

const SUB_GROUP_COLORS = [
  "#2563EB",
  "#C9962B",
  "#16A34A",
  "#9333EA",
  "#0891B2",
  "#DC2626",
  "#EA580C",
  "#D946EF",
  "#65A30D",
];

interface SubGroupChartProps {
  subGroups: SubGroupDetail[];
}

const SubGroupLineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ subGroups }: SubGroupChartProps) {
        // Merge all sub-groups into single data array keyed by period
        const periodMap = new Map<string, Record<string, number | string>>();
        for (const sg of subGroups) {
          for (const d of sg.data) {
            if (!periodMap.has(d.period)) periodMap.set(d.period, { period: d.period });
            periodMap.get(d.period)![sg.name] = d.ratio;
          }
        }
        const chartData = Array.from(periodMap.values()).sort((a, b) =>
          String(a.period).localeCompare(String(b.period)),
        );

        const formatDate = (value: string) => {
          if (!value) return "";
          const parts = value.split("-");
          // monthly: "2024-01" → "24.1", daily/weekly: "2024-01-15" → "1/15"
          if (parts.length === 2) return `${parts[0].slice(2)}.${Number(parts[1])}`;
          return `${Number(parts[1])}/${Number(parts[2])}`;
        };

        return (
          <mod.ResponsiveContainer width="100%" height={280}>
            <mod.LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <mod.XAxis
                dataKey="period"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "#6B7280" }}
                interval="preserveStartEnd"
              />
              <mod.YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                width={36}
                domain={[0, 100]}
              />
              <mod.Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={((label: string) => label) as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [value.toFixed(1), name]) as any}
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {subGroups.map((sg, idx) => (
                <mod.Line
                  key={sg.name}
                  type="monotone"
                  dataKey={sg.name}
                  name={sg.name}
                  stroke={SUB_GROUP_COLORS[idx % SUB_GROUP_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </mod.LineChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const PERIODS = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "10y", label: "10년" },
];

// ---------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------

function TrendIcon({ trend }: { trend: "rising" | "falling" | "stable" }) {
  if (trend === "rising") return <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />;
  if (trend === "falling") return <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />;
  return <Minus className="h-4 w-4 text-gray-400" aria-hidden="true" />;
}

function TrendText({ trend, changeRate }: { trend: "rising" | "falling" | "stable"; changeRate: number }) {
  const colorClass =
    trend === "rising"
      ? "text-green-600"
      : trend === "falling"
      ? "text-red-600"
      : "text-gray-500";
  const sign = changeRate > 0 ? "+" : "";
  return (
    <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
      {sign}{changeRate.toFixed(1)}%
    </span>
  );
}

function GapScoreBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        HIGH
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
        MED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
      LOW
    </span>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        HIGH
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
        MED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      LOW
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colorClass =
    categoryColors[category as BlogCategoryValue] ?? "bg-[var(--background)] text-[var(--muted)]";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {category}
    </span>
  );
}

// ---------------------------------------------------------------
// Section 1: Category overview cards
// ---------------------------------------------------------------

interface CategoryCardProps {
  cat: OverviewCategory;
  isSelected: boolean;
  onClick: () => void;
  onRetry: () => void;
}

function CategoryCard({ cat, isSelected, onClick, onRetry }: CategoryCardProps) {
  const hasError = !!cat.error;

  if (hasError) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--muted)]">{cat.category}</span>
        </div>
        <p className="mb-3 text-xs text-[var(--muted)]">{cat.error}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onRetry(); }}
          className="rounded px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-blue-50 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const trend = cat.overallTrend ?? "stable";
  const changeRate = cat.changeRate ?? 0;
  const risingCount = cat.risingCount ?? 0;

  const borderClass = isSelected
    ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20"
    : "border-[var(--border)] hover:border-[var(--color-primary-light)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-[var(--surface)] p-4 shadow-sm text-left transition-all cursor-pointer w-full ${borderClass}`}
      aria-pressed={isSelected}
      aria-label={`${cat.category} 트렌드 상세 보기`}
    >
      <div className="mb-1">
        <span className="text-sm font-semibold text-[var(--foreground)]">{cat.category}</span>
      </div>
      {cat.monthlyTotalVolume != null ? (
        <p className="text-lg font-bold text-[var(--foreground)] tabular-nums leading-tight">
          {cat.monthlyTotalVolume.toLocaleString("ko-KR")}
          <span className="ml-0.5 text-xs font-normal text-[var(--muted)]">/월</span>
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">검색량 미연동</p>
      )}
      <div className="mt-1 flex items-center gap-1">
        <TrendIcon trend={trend} />
        <span className={`text-xs tabular-nums ${
          trend === "rising" ? "text-green-600" : trend === "falling" ? "text-red-600" : "text-gray-500"
        }`}>
          {changeRate > 0 ? "+" : ""}{changeRate.toFixed(1)}%
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[var(--muted)]">
        상승 {risingCount}개
        {cat.topSubGroup && <> · 톱: {cat.topSubGroup}</>}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------
// Section 2: Category drilldown detail
// ---------------------------------------------------------------

interface CategoryDetailProps {
  slug: string;
  period: string;
  onClose: () => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
  volumeMap: Map<string, number>;
}

function CategoryDetail({ slug, period, onClose, detailRef, volumeMap }: CategoryDetailProps) {
  const { data, loading, error, refetch } = useAdminApi<CategoryDetailData>(
    `/api/admin/naver-datalab/category/${slug}?period=${period}`,
  );

  return (
    <div
      ref={detailRef}
      className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--surface)] p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {data ? `${data.category} 상세 트렌드` : "상세 트렌드 로딩 중..."}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
          aria-label="상세 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && <AdminLoadingSkeleton variant="chart" />}
      {error && <AdminErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="mb-4 rounded-xl bg-[var(--background)] p-4">
            <SubGroupLineChart subGroups={data.subGroups} />
          </div>

          {/* Sub-group summary bars */}
          <div className="space-y-2">
            {data.subGroups
              .slice()
              .sort((a, b) => {
                const aVol = volumeMap.get(a.name);
                const bVol = volumeMap.get(b.name);
                if (aVol != null && bVol != null) return bVol - aVol;
                if (aVol != null) return -1;
                if (bVol != null) return 1;
                return b.currentAvg - a.currentAvg;
              })
              .map((sg, idx) => {
                const vol = volumeMap.get(sg.name);
                const maxVol = Math.max(...data.subGroups.map((s) => volumeMap.get(s.name) ?? 0), 1);
                const barWidth = vol != null
                  ? `${Math.min(100, (vol / maxVol) * 100)}%`
                  : `${Math.min(100, sg.currentAvg)}%`;
                const barColor = SUB_GROUP_COLORS[idx % SUB_GROUP_COLORS.length];
                return (
                  <div key={sg.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-[var(--muted)]" title={sg.name}>
                      {sg.name}
                    </span>
                    <div className="flex-1 overflow-hidden rounded-full bg-[var(--border)] h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: barWidth, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-[var(--muted)] tabular-nums">
                      {vol != null ? vol.toLocaleString("ko-KR") : sg.currentAvg.toFixed(1)}
                    </span>
                    <TrendText trend={sg.trend} changeRate={sg.changeRate} />
                  </div>
                );
              })}
          </div>

          <p className="mt-3 text-xs text-[var(--muted)]">
            * ratio 값은 이 카테고리 내에서의 상대적 검색 비율 (0~100). 검색량은 검색광고 API 연동 시 절대 검색량, 미연동 시 상대값 표시
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Sort state management for content gap table
// ---------------------------------------------------------------

type GapSortKey = "gapScore" | "changeRate" | "existingPostCount" | "currentAvg" | "monthlyVolume";

function useGapTableSort(initial: GapSortKey = "gapScore") {
  const [sortKey, setSortKey] = useState<GapSortKey>(initial);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = useCallback(
    (key: string) => {
      const k = key as GapSortKey;
      if (k === sortKey) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(k);
        setSortDirection("desc");
      }
    },
    [sortKey],
  );

  const sort = useCallback(
    (rows: ContentGapItem[]) =>
      [...rows].sort((a, b) => {
        const totalVol = (r: ContentGapItem) =>
          (r.monthlyVolume ?? 0) + (r.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0);
        const av =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (totalVol(a) || a.currentAvg)
            : (a[sortKey] as number);
        const bv =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (totalVol(b) || b.currentAvg)
            : (b[sortKey] as number);
        const dir = sortDirection === "asc" ? 1 : -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      }),
    [sortKey, sortDirection],
  );

  return { sortKey, sortDirection, handleSort, sort };
}

// ---------------------------------------------------------------
// Main TrendTab component
// ---------------------------------------------------------------

export function TrendTab() {
  const router = useRouter();

  const [period, setPeriod] = useState<"1m" | "3m" | "1y" | "3y" | "10y">("3m");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const detailRef = useRef<HTMLDivElement | null>(null);

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useAdminApi<OverviewData>(`/api/admin/naver-datalab/overview?period=${period}`);

  const { sortKey: gapSortKey, sortDirection: gapSortDir, handleSort: handleGapSort, sort: sortGapRows } =
    useGapTableSort("monthlyVolume");

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "1m" | "3m" | "1y" | "3y" | "10y");
    setSelectedCategory(null);
  };

  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(slug);
    // Scroll to detail section after state update
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleNewPost = (slug: string) => {
    router.push(`/admin?tab=blog&newCategory=${slug}`);
  };

  // ── Graceful degradation ─────────────────────────────────────
  if (!overviewLoading && !overviewError && overviewData === null) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <p className="text-sm text-[var(--muted)]">
          네이버 DataLab API 키가 설정되지 않았습니다. 환경변수{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">
            NAVER_DATALAB_CLIENT_ID
          </code>{" "}
          와{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">
            NAVER_DATALAB_CLIENT_SECRET
          </code>{" "}
          을 설정해주세요.
        </p>
      </div>
    );
  }

  const gapRows = overviewData
    ? sortGapRows(overviewData.contentGap).map((item) => ({
        ...item,
        id: `${item.slug}-${item.subGroup}`,
      }))
    : [];

  const maxVolume = overviewData
    ? Math.max(
        ...overviewData.contentGap.map(
          (g) => (g.monthlyVolume ?? 0) + (g.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0),
        ),
        1,
      )
    : 1;

  const selectedVolumeMap = (() => {
    const map = new Map<string, number>();
    if (overviewData && selectedCategory) {
      for (const gap of overviewData.contentGap) {
        if (gap.slug === selectedCategory && gap.monthlyVolume != null) {
          const relatedSum = (gap.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0);
          map.set(gap.subGroup, gap.monthlyVolume + relatedSum);
        }
      }
    }
    return map;
  })();

  const suggestions = overviewData?.suggestions ?? [];

  return (
    <div className="space-y-8">
      {/* ── Period selector ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector periods={PERIODS} selected={period} onChange={handlePeriodChange} />
        {overviewData?.period && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            {overviewData.period.start} ~ {overviewData.period.end}
          </span>
        )}
      </div>

      {/* ── Section 1: Category overview cards ───────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리별 검색 트렌드 개요
        </h2>

        {overviewLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
              >
                <div className="mb-2 h-4 w-20 rounded bg-[var(--border)]" />
                <div className="h-5 w-16 rounded bg-[var(--border)]" />
                <div className="mt-1.5 h-3 w-24 rounded bg-[var(--border)]" />
              </div>
            ))}
          </div>
        )}

        {overviewError && (
          <AdminErrorState message={overviewError} onRetry={refetchOverview} />
        )}

        {!overviewLoading && !overviewError && overviewData && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {overviewData.categories.map((cat) => (
              <CategoryCard
                key={cat.slug}
                cat={cat}
                isSelected={selectedCategory === cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                onRetry={refetchOverview}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Category drilldown ─────────────── */}
      {selectedCategory && (
        <section>
          <CategoryDetail
            slug={selectedCategory}
            period={period}
            onClose={() => setSelectedCategory(null)}
            detailRef={detailRef}
            volumeMap={selectedVolumeMap}
          />
        </section>
      )}

      {/* ── Section 3: Content gap table ──────────────── */}
      {overviewData && overviewData.contentGap.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              콘텐츠 갭 분석 — 검색 수요 vs 콘텐츠 현황
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {overviewData?.volumeSource === "searchad"
                ? "갭 점수 = 검색량(70%) + 트렌드 보너스(5%) + 콘텐츠 부족도(25%)"
                : "갭 점수 = 상대 검색량(70%) + 트렌드 보너스(5%) + 콘텐츠 부족도(25%)"}
              &nbsp;·&nbsp;
              <span className="text-red-600 font-medium">HIGH(≥70): 시급</span>
              &nbsp;·&nbsp;
              <span className="text-yellow-600 font-medium">MED(≥40): 권장</span>
              &nbsp;·&nbsp;
              <span className="text-green-600 font-medium">LOW(&lt;40)</span>
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
            <DataTable
              columns={[
                {
                  key: "subGroup",
                  label: "키워드 영역",
                  align: "left",
                  render: (row) => {
                    const related = (row.relatedKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    return (
                      <div>
                        <span className="font-medium text-[var(--foreground)]">
                          {String(row.subGroup)}
                        </span>
                        {related.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {related.map((rk) => (
                              <span
                                key={rk.keyword}
                                className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
                                title={`월 ${rk.volume.toLocaleString("ko-KR")}회`}
                              >
                                {rk.keyword}
                                <span className="ml-0.5 text-blue-400 tabular-nums">
                                  {rk.volume >= 1000
                                    ? `${(rk.volume / 1000).toFixed(1)}k`
                                    : rk.volume}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "category",
                  label: "카테고리",
                  align: "left",
                  render: (row) => <CategoryBadge category={String(row.category)} />,
                },
                {
                  key: "monthlyVolume",
                  label: "검색량",
                  align: "right",
                  sortable: true,
                  render: (row) => {
                    const mv = row.monthlyVolume as number | null;
                    const related = (row.relatedKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    const relatedSum = related.reduce((s, rk) => s + rk.volume, 0);
                    const totalVolume = mv != null ? mv + relatedSum : null;
                    const barPct = totalVolume != null ? Math.min(100, (totalVolume / maxVolume) * 100) : 0;
                    return (
                      <div>
                        <span className="tabular-nums font-medium text-[var(--foreground)]">
                          {totalVolume != null ? (
                            <>
                              {row.isEstimated ? "≈ " : ""}
                              {totalVolume.toLocaleString("ko-KR")}
                              <span className="ml-0.5 text-[10px] font-normal text-[var(--muted)]">/월</span>
                            </>
                          ) : (
                            <span className="font-normal text-[var(--muted)]">
                              {Number(row.currentAvg).toFixed(1)}
                              <span className="ml-0.5 text-[10px]">(상대)</span>
                            </span>
                          )}
                        </span>
                        {totalVolume != null && relatedSum > 0 && (
                          <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 mt-0.5">
                            직접
                            <span className="ml-0.5 tabular-nums text-blue-400">
                              {(mv ?? 0).toLocaleString("ko-KR")}
                            </span>
                          </span>
                        )}
                        {totalVolume != null && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-1.5 rounded-full bg-blue-400"
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "existingPostCount",
                  label: "포스트 수",
                  align: "right",
                  sortable: true,
                  render: (row) => (
                    <span className="tabular-nums text-[var(--foreground)]">
                      {Number(row.existingPostCount)}
                    </span>
                  ),
                },
                {
                  key: "gapScore",
                  label: "갭 점수",
                  align: "right",
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="tabular-nums text-[var(--foreground)]">
                        {Number(row.gapScore).toFixed(0)}
                      </span>
                      <GapScoreBadge score={Number(row.gapScore)} />
                    </div>
                  ),
                },
                {
                  key: "trend",
                  label: "트렌드",
                  align: "center",
                  render: (row) => (
                    <span className="flex justify-center">
                      <TrendIcon trend={row.trend as "rising" | "falling" | "stable"} />
                    </span>
                  ),
                },
                {
                  key: "changeRate",
                  label: "변화율",
                  align: "right",
                  sortable: true,
                  render: (row) => (
                    <TrendText
                      trend={row.trend as "rising" | "falling" | "stable"}
                      changeRate={Number(row.changeRate)}
                    />
                  ),
                },
              ]}
              rows={gapRows as unknown as Record<string, unknown>[]}
              keyField="id"
              emptyMessage="콘텐츠 갭 데이터가 없습니다"
              sortKey={gapSortKey}
              sortDirection={gapSortDir}
              onSort={handleGapSort}
            />
          </div>
        </section>
      )}

      {/* ── Section 4: Topic suggestions ──────────────── */}
      {overviewData && suggestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            추천 블로그 주제 — 검색량 + 콘텐츠 갭 기반
          </h2>
          <div className="space-y-3">
            {suggestions.slice(0, 15).map((item) => (
              <div
                key={`${item.rank}-${item.slug}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--muted)]">
                    {item.rank}
                  </span>
                  <PriorityBadge priority={item.priority} />
                  <CategoryBadge category={item.category} />
                  {(() => {
                    const gap = overviewData?.contentGap.find(
                      (g) => g.slug === item.slug && g.keywords.some((k) => item.keywords.includes(k)),
                    );
                    if (!gap?.monthlyVolume) return null;
                    return (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 tabular-nums">
                        {gap.monthlyVolume.toLocaleString("ko-KR")}/월
                      </span>
                    );
                  })()}
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={item.trend} />
                  </div>
                </div>

                <p className="mb-1.5 text-sm font-semibold text-[var(--foreground)] leading-snug">
                  {item.suggestedTitle}
                </p>

                <p className="mb-2 text-xs text-[var(--muted)] leading-relaxed">
                  {item.reasoning}
                </p>

                {item.keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {item.keywords.slice(0, 5).map((kw) => (
                      <span
                        key={kw}
                        className="rounded bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]"
                      >
                        {kw}
                      </span>
                    ))}
                    {/* 연관 키워드 (콘텐츠 갭에서 조회) */}
                    {(() => {
                      const gap = overviewData?.contentGap.find(
                        (g) => g.slug === item.slug && g.keywords.some((k) => item.keywords.includes(k)),
                      );
                      const related = (gap?.relatedKeywords ?? []).filter(
                        (rk) => !item.keywords.includes(rk.keyword),
                      );
                      if (related.length === 0) return null;
                      return related.slice(0, 3).map((rk) => (
                        <span
                          key={rk.keyword}
                          className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                          title={`연관 키워드 · 월 ${rk.volume.toLocaleString("ko-KR")}회`}
                        >
                          {rk.keyword}
                          <span className="ml-0.5 text-blue-400 tabular-nums text-[10px]">
                            {rk.volume >= 1000
                              ? `${(rk.volume / 1000).toFixed(1)}k`
                              : rk.volume}
                          </span>
                        </span>
                      ));
                    })()}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleNewPost(item.slug)}
                    className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    새 포스트 작성
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state when data loaded but everything is null ─ */}
      {!overviewLoading && !overviewError && overviewData &&
        overviewData.contentGap.length === 0 &&
        suggestions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            카테고리 카드를 클릭하여 상세 트렌드를 확인하세요.
            <br />
            콘텐츠 갭 분석과 주제 추천은 카테고리 데이터 로드 후 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
