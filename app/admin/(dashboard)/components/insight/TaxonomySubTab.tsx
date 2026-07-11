"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Layers,
  Search,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  CATEGORY_KEYWORDS,
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
  type CategoryKeywords,
  type KeywordSubGroup,
} from "@/lib/admin-naver-datalab-keywords";
import { isBlogCategorySlug } from "@/lib/blog";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { useAdminApi, forceRefetchAdminApi } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import type { CategoryTrendData } from "@/lib/trend-analysis";
import type { TrendOverviewCategory, TrendSummaryData } from "./shared";
import { ApiSourceBadge } from "./ApiSourceBadge";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: "정보",
  commercial: "비교/검토",
  transactional: "전환",
  navigational: "탐색",
};

const INTENT_COLORS: Record<SearchIntent, string> = {
  informational: "bg-blue-100 text-blue-700",
  commercial: "bg-amber-100 text-amber-700",
  transactional: "bg-green-100 text-green-700",
  navigational: "bg-purple-100 text-purple-700",
};

const INTENT_BAR_COLORS: Record<SearchIntent, string> = {
  informational: "bg-blue-400",
  commercial: "bg-amber-400",
  transactional: "bg-green-400",
  navigational: "bg-purple-400",
};

const SUB_GROUP_COLORS = [
  "#2563EB", "#C9962B", "#16A34A", "#9333EA", "#0891B2",
  "#DC2626", "#EA580C", "#D946EF", "#65A30D",
];

interface SubGroupChartProps {
  subGroups: CategoryTrendData["subGroups"];
}

// ---------------------------------------------------------------
// Dynamic chart (from TrendSubTab)
// ---------------------------------------------------------------

const SubGroupLineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ subGroups }: SubGroupChartProps) {
        const periodMap = new Map<string, Record<string, number | string>>();
        for (const sg of subGroups) {
          for (const d of sg.data) {
            if (!periodMap.has(d.period)) periodMap.set(d.period, { period: d.period });
            periodMap.get(d.period)![sg.name] = d.ratio;
          }
        }
        const chartData = Array.from(periodMap.values()).sort((a, b) =>
          (a.period as string).localeCompare(b.period as string),
        );

        return (
          <mod.ResponsiveContainer width="100%" height={260}>
            <mod.LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <mod.CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <mod.XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} />
              <mod.YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <mod.Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: number, name: string) => [value.toFixed(1), name]) as any}
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {subGroups.map((sg, idx) => (
                <mod.Line key={sg.name} type="monotone" dataKey={sg.name} name={sg.name} stroke={SUB_GROUP_COLORS[idx % SUB_GROUP_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
// Helpers
// ---------------------------------------------------------------

function getIntentDistribution(cat: CategoryKeywords) {
  const counts: Record<SearchIntent, number> = {
    informational: 0,
    commercial: 0,
    transactional: 0,
    navigational: 0,
  };
  for (const sg of cat.subGroups) {
    counts[sg.searchIntent] += 1;
  }
  return counts;
}

function TrendIcon({ trend }: { trend: "rising" | "falling" | "stable" }) {
  if (trend === "rising") return <TrendingUp size={14} className="text-green-600" />;
  if (trend === "falling") return <TrendingDown size={14} className="text-red-600" />;
  return <Minus size={14} className="text-gray-400" />;
}

// ---------------------------------------------------------------
// Intent distribution mini bar
// ---------------------------------------------------------------

function IntentBar({ cat }: { cat: CategoryKeywords }) {
  const dist = getIntentDistribution(cat);
  const total = cat.subGroups.length;
  if (total === 0) return null;

  const segments = (
    Object.entries(dist) as [SearchIntent, number][]
  ).filter(([, v]) => v > 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        {segments.map(([intent, count]) => (
          <div
            key={intent}
            className={`${INTENT_BAR_COLORS[intent]} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {segments.map(([intent, count]) => (
          <span
            key={intent}
            className={`rounded px-1 py-0.5 text-[10px] font-medium ${INTENT_COLORS[intent]}`}
          >
            {INTENT_LABELS[intent]} {count}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Category overview card (grid view)
// ---------------------------------------------------------------

function CategoryCard({
  cat,
  isSelected,
  onClick,
  trendInfo,
}: {
  cat: CategoryKeywords;
  isSelected: boolean;
  onClick: () => void;
  trendInfo?: TrendOverviewCategory;
}) {
  const totalKw = cat.subGroups.reduce((s, g) => s + g.keywords.length, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {getKeywordCategoryLabel(cat.slug)}
      </h3>

      {/* Monthly volume */}
      {trendInfo?.monthlyTotalVolume != null ? (
        <p className="mt-1 text-lg font-bold text-[var(--foreground)] tabular-nums leading-tight">
          {trendInfo.monthlyTotalVolume.toLocaleString("ko-KR")}
          <span className="ml-0.5 text-xs font-normal text-[var(--muted)]">/월</span>
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-gray-400">{cat.slug}</p>
      )}

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Layers size={12} />
          {cat.subGroups.length}개 그룹
        </span>
        <span className="flex items-center gap-1">
          <Tag size={12} />
          {totalKw}개
        </span>
      </div>

      <div className="mt-3">
        <IntentBar cat={cat} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------
// SubGroup panel (flat keyword view)
// ---------------------------------------------------------------

function SubGroupPanel({
  sg,
  filter,
}: {
  sg: KeywordSubGroup;
  filter: string;
}) {
  const q = filter.trim().toLowerCase();

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="flex-1 text-sm font-semibold">{sg.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${INTENT_COLORS[sg.searchIntent]}`}
        >
          {INTENT_LABELS[sg.searchIntent]}
        </span>
        <span className="text-xs text-gray-400">{sg.keywords.length}개</span>
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {sg.keywords.map((kw, i) => {
            const isMatch = q && kw.toLowerCase().includes(q);
            return (
              <span
                key={kw}
                className={`inline-block rounded-md px-2 py-1 text-xs ${
                  i < 2
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : isMatch
                      ? "bg-yellow-100 text-yellow-800 font-medium"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {kw}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          ★ 앞 2개 = 검색량 조회 대표 키워드
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Trend view (loaded on demand inside detail panel)
// ---------------------------------------------------------------

const TREND_PERIODS = [
  { value: "1m", label: "1개월", days: 30, source: "short" as const, unit: "일별" as const },
  { value: "3m", label: "3개월", days: 90, source: "short" as const, unit: "일별" as const },
  { value: "1y", label: "1년", days: 365, source: "long" as const, unit: "주별" as const },
  { value: "3y", label: "3년", days: 1095, source: "long" as const, unit: "주별" as const },
];

/** 시계열 데이터에서 최근 N일에 해당하는 데이터만 추출 */
function sliceTimeSeries(
  subGroups: CategoryTrendData["subGroups"],
  days: number,
): CategoryTrendData["subGroups"] {
  const cutoff = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return subGroups.map((sg) => ({
    ...sg,
    data: sg.data.filter((d) => d.period >= cutoffStr),
  }));
}

type TrendSummaryResult = { weightedAvg: number; stdDev: number; count: number } | null;

function TrendView({
  slug,
  volumeMap,
  shortTermDetail,
  longTermDetail,
  loading,
  shortTermSummary,
  longTermSummary,
}: {
  slug: KeywordCategorySlug;
  volumeMap: Map<string, number>;
  shortTermDetail: CategoryTrendData[] | undefined;
  longTermDetail: CategoryTrendData[] | undefined;
  loading: boolean;
  shortTermSummary: TrendSummaryResult;
  longTermSummary: TrendSummaryResult;
}) {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("3m");

  const periodConfig = TREND_PERIODS.find((p) => p.value === selectedPeriod) ?? TREND_PERIODS[1];
  const sourceData = periodConfig.source === "short" ? shortTermDetail : longTermDetail;
  const detail = sourceData?.find((c) => c.slug === slug);

  const slicedSubGroups = useMemo(() => {
    if (!detail) return [];
    const sliced = sliceTimeSeries(detail.subGroups, periodConfig.days);
    // Sort by volume (descending), fallback to currentAvg
    return [...sliced].sort((a, b) => {
      const va = volumeMap.get(a.name) ?? -1;
      const vb = volumeMap.get(b.name) ?? -1;
      if (va !== -1 || vb !== -1) return vb - va;
      return b.currentAvg - a.currentAvg;
    });
  }, [detail, periodConfig.days, volumeMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--muted)]">
        <Loader2 size={16} className="animate-spin" />
        트렌드 데이터 로딩 중...
      </div>
    );
  }

  if (!detail || slicedSubGroups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        트렌드 데이터가 없습니다.
      </p>
    );
  }

  const activeSummary = periodConfig.source === "short" ? shortTermSummary : longTermSummary;

  return (
    <div className="space-y-4">
      {/* Platform trend summary */}
      {activeSummary && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
          <span className="text-[var(--muted)]">전체 트렌드</span>
          <span className={`font-semibold tabular-nums ${
            activeSummary.weightedAvg > 0 ? "text-green-600" : activeSummary.weightedAvg < 0 ? "text-red-600" : "text-gray-500"
          }`}>
            {activeSummary.weightedAvg > 0 ? "+" : ""}{activeSummary.weightedAvg.toFixed(1)}%
          </span>
          <span className="text-[var(--muted)]">
            편차 {activeSummary.stdDev.toFixed(1)}%
            {activeSummary.stdDev < 10 ? " · 균일" : " · 카테고리별 차이 있음"}
          </span>
          <span className="text-[var(--muted)]">({activeSummary.count}개)</span>
        </div>
      )}

      {/* Period selector + range */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {TREND_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setSelectedPeriod(p.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPeriod === p.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {slicedSubGroups[0]?.data.length > 0 && (() => {
          const firstDate = slicedSubGroups[0].data[0].period;
          const lastDate = slicedSubGroups[0].data[slicedSubGroups[0].data.length - 1].period;

          if (periodConfig.unit === "주별") {
            const toWeekLabel = (dateStr: string) => {
              const d = new Date(dateStr);
              const year = d.getFullYear();
              const month = d.getMonth() + 1;
              const week = Math.ceil(d.getDate() / 7);
              return `${year}년 ${month}월 ${week}주`;
            };
            return (
              <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                {toWeekLabel(firstDate)} ~ {toWeekLabel(lastDate)} · 주별
              </span>
            );
          }

          return (
            <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
              {firstDate} ~ {lastDate} · {periodConfig.unit}
            </span>
          );
        })()}
      </div>

      {/* Line chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <SubGroupLineChart subGroups={slicedSubGroups} />
      </div>

      {/* SubGroup bars with volume */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 space-y-2">
        <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">서브그룹별 트렌드</h4>
        {slicedSubGroups.map((sg, idx) => {
          const vol = volumeMap.get(sg.name);
          const maxAvg = Math.max(...slicedSubGroups.map((s) => s.currentAvg), 1);
          const barWidth = `${Math.max((sg.currentAvg / maxAvg) * 100, 2)}%`;
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
              <TrendIcon trend={sg.trend} />
              <span
                className={`w-14 shrink-0 text-right text-xs tabular-nums ${
                  sg.trend === "rising"
                    ? "text-green-600"
                    : sg.trend === "falling"
                      ? "text-red-600"
                      : "text-gray-400"
                }`}
              >
                {sg.changeRate > 0 ? "+" : ""}
                {sg.changeRate.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <AdminActionButton
          tone="primary"
          onClick={() => router.push("/admin/content/strategy")}
          className="min-h-8 px-3 py-1 text-xs"
        >
          콘텐츠 전략
        </AdminActionButton>
        {isBlogCategorySlug(slug) && (
          <AdminActionButton
            tone="dark"
            onClick={() => router.push(`/admin/content/posts/new?category=${slug}`)}
            className="min-h-8 px-3 py-1 text-xs"
          >
            포스트 작성
          </AdminActionButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Category detail panel (drill-down)
// ---------------------------------------------------------------

function CategoryDetail({
  cat,
  filter,
  volumeMap,
  shortTermDetail,
  longTermDetail,
  loading,
  shortTermSummary,
  longTermSummary,
}: {
  cat: CategoryKeywords;
  filter: string;
  volumeMap: Map<string, number>;
  shortTermDetail: CategoryTrendData[] | undefined;
  longTermDetail: CategoryTrendData[] | undefined;
  loading: boolean;
  shortTermSummary: TrendSummaryResult;
  longTermSummary: TrendSummaryResult;
}) {
  const [showTrend, setShowTrend] = useState(false);
  const totalKw = cat.subGroups.reduce((s, g) => s + g.keywords.length, 0);

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return cat.subGroups;
    const q = filter.trim().toLowerCase();
    return cat.subGroups.filter(
      (sg) =>
        sg.name.toLowerCase().includes(q) ||
        sg.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  }, [cat.subGroups, filter]);

  return (
    <section className="space-y-4">
      {/* Detail header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h3 className="text-base font-bold">
            {getKeywordCategoryLabel(cat.slug)}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {cat.slug}
            </span>
          </h3>
          <p className="text-xs text-gray-500">
            {cat.subGroups.length}개 서브그룹 · {totalKw}개 키워드
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTrend(!showTrend)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            showTrend
              ? "bg-primary text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <BarChart3 size={14} />
          트렌드
        </button>
      </div>

      {/* Trend view (on demand) */}
      {showTrend && (
        <TrendView slug={cat.slug} volumeMap={volumeMap} shortTermDetail={shortTermDetail} longTermDetail={longTermDetail} loading={loading} shortTermSummary={shortTermSummary} longTermSummary={longTermSummary} />
      )}

      {/* Keywords view */}
      {!showTrend && (
        <>
          {filteredGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              &ldquo;{filter}&rdquo; 검색 결과가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((sg) => (
                <SubGroupPanel key={sg.name} sg={sg} filter={filter} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

const VOLUME_ENDPOINT = `/api/admin/naver-datalab/trend-summary?period=3m&mode=volume`;
const TREND_SHORT_ENDPOINT = `/api/admin/naver-datalab/trend-summary?period=3m&mode=trend&detail=short`;
const TREND_LONG_ENDPOINT = `/api/admin/naver-datalab/trend-summary?period=3m&mode=trend&detail=long`;

export function TaxonomySubTab() {
  const [selectedCategory, setSelectedCategory] =
    useState<KeywordCategorySlug | null>(null);
  const [filter, setFilter] = useState("");
  const [forceLoading, setForceLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  // Phase 1: SearchAd 검색량 (eager — 카드 즉시 표시)
  const { data: volumeData, loading: volumeLoading, error: volumeError, refetch: refetchVolume } = useAdminApi<TrendSummaryData>(
    VOLUME_ENDPOINT,
  );

  // Phase 2: DataLab 단기 트렌드 (background — 카드 트렌드 방향 + 1m/3m 차트)
  const { data: trendShortData } = useAdminApi<TrendSummaryData>(
    TREND_SHORT_ENDPOINT,
  );

  // Phase 3: DataLab 장기 트렌드 (shortTerm 완료 후 자동 시작)
  const { data: trendLongData } = useAdminApi<TrendSummaryData>(
    TREND_LONG_ENDPOINT,
    !!trendShortData,
  );

  // 세 결과를 병합
  const overviewData = useMemo(() => {
    if (!volumeData && !trendShortData) return null;
    return {
      ...(volumeData ?? trendShortData)!,
      shortTermDetail: trendShortData?.shortTermDetail ?? volumeData?.shortTermDetail,
      longTermDetail: trendLongData?.longTermDetail ?? trendShortData?.longTermDetail,
      categories: trendShortData?.categories ?? volumeData?.categories,
    };
  }, [volumeData, trendShortData, trendLongData]);

  const overviewLoading = volumeLoading;
  const overviewError = volumeError;

  const handleForceRefresh = useCallback(async () => {
    setForceLoading(true);
    try {
      const promises = [
        forceRefetchAdminApi<TrendSummaryData>(VOLUME_ENDPOINT),
        forceRefetchAdminApi<TrendSummaryData>(TREND_SHORT_ENDPOINT),
      ];
      if (trendShortData) {
        promises.push(forceRefetchAdminApi<TrendSummaryData>(TREND_LONG_ENDPOINT));
      }
      await Promise.all(promises);
    } catch {
      // 에러는 SWR이 처리
    } finally {
      setForceLoading(false);
    }
  }, [trendShortData]);

  // Category trend info map for cards
  const trendInfoMap = useMemo(() => {
    const map = new Map<KeywordCategorySlug, TrendOverviewCategory>();
    if (overviewData?.categories) {
      for (const cat of overviewData.categories) {
        map.set(cat.slug, cat);
      }
    }
    return map;
  }, [overviewData]);

  // Volume map for selected category
  const selectedVolumeMap = useMemo(() => {
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
  }, [overviewData, selectedCategory]);

  // Sort categories by monthly volume (descending) when data available
  const sortedCategories = useMemo(() => {
    if (trendInfoMap.size === 0) return CATEGORY_KEYWORDS;
    return [...CATEGORY_KEYWORDS].sort((a, b) => {
      const va = trendInfoMap.get(a.slug)?.monthlyTotalVolume ?? -1;
      const vb = trendInfoMap.get(b.slug)?.monthlyTotalVolume ?? -1;
      return vb - va;
    });
  }, [trendInfoMap]);

  const selectedCat = useMemo(
    () => CATEGORY_KEYWORDS.find((c) => c.slug === selectedCategory) ?? null,
    [selectedCategory]
  );

  // 트렌드 요약 계산 헬퍼
  const calcSummary = useCallback(
    (detail: CategoryTrendData[] | undefined) => {
      if (!detail || detail.length === 0) return null;
      const items: Array<{ changeRate: number; volume: number }> = [];
      for (const cat of detail) {
        const volume = overviewData?.categories?.find((c) => c.slug === cat.slug)?.monthlyTotalVolume;
        if (volume == null || volume <= 0) continue;
        // 카테고리 대표 변화율: 서브그룹 중 최대 절대값
        const changeRate = cat.subGroups.reduce(
          (max, sg) => (Math.abs(sg.changeRate) > Math.abs(max) ? sg.changeRate : max), 0,
        );
        items.push({ changeRate, volume });
      }
      if (items.length === 0) return null;
      const totalVolume = items.reduce((s, i) => s + i.volume, 0);
      const weightedAvg = items.reduce((s, i) => s + i.changeRate * i.volume, 0) / totalVolume;
      const simpleAvg = items.reduce((s, i) => s + i.changeRate, 0) / items.length;
      const variance = items.reduce((s, i) => s + Math.pow(i.changeRate - simpleAvg, 2), 0) / items.length;
      return { weightedAvg, stdDev: Math.sqrt(variance), count: items.length };
    },
    [overviewData?.categories],
  );

  // 단기(6m) / 장기(3y) 전체 트렌드 요약
  const shortTermSummary = useMemo(() => calcSummary(overviewData?.shortTermDetail), [calcSummary, overviewData?.shortTermDetail]);
  const longTermSummary = useMemo(() => calcSummary(overviewData?.longTermDetail), [calcSummary, overviewData?.longTermDetail]);

  // Scroll to detail when category selected
  useEffect(() => {
    if (selectedCat && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCat]);

  // ENV not configured — only show after loading completes with null data
  const isEnvMissing = !overviewLoading && !overviewError && overviewData === null;

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["naverDatalab"]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">키워드 택소노미</h2>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={forceLoading || overviewLoading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={forceLoading ? "animate-spin" : ""} />
          데이터 갱신
        </button>
      </div>

      {/* ENV warning */}
      {isEnvMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          네이버 DataLab API 키가 설정되지 않았습니다. 환경변수{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_ID</code>{" "}
          및{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_SECRET</code>{" "}
          를 확인하세요.
        </div>
      )}

      {/* API error */}
      {overviewError && <AdminErrorState message={overviewError} onRetry={refetchVolume} />}

      {/* Overall trend summary — TrendView 내부에서 표시 */}

      {/* Category card grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리 개요
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sortedCategories.map((cat) => (
            <CategoryCard
              key={cat.slug}
              cat={cat}
              isSelected={selectedCategory === cat.slug}
              trendInfo={trendInfoMap.get(cat.slug)}
              onClick={() => {
                setSelectedCategory(
                  selectedCategory === cat.slug ? null : cat.slug
                );
                setFilter("");
              }}
            />
          ))}
        </div>
      </section>

      {/* Loading indicator */}
      {selectedCategory && overviewLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-4 text-sm text-[var(--muted)]">
          <Loader2 size={16} className="animate-spin" />
          트렌드 데이터 로딩 중...
        </div>
      )}

      {/* Detail panel (shown when a category is selected) */}
      {selectedCat && (
        <section ref={detailRef}>
          {/* Search within selected category */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="서브그룹, 키워드 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <CategoryDetail
            cat={selectedCat}
            filter={filter}
            volumeMap={selectedVolumeMap}
            shortTermDetail={overviewData?.shortTermDetail}
            longTermDetail={overviewData?.longTermDetail}
            loading={overviewLoading}
            shortTermSummary={shortTermSummary}
            longTermSummary={longTermSummary}
          />
        </section>
      )}
    </div>
  );
}
