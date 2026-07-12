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
  getBlogCategoryForKeywordTopic,
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
  type SearchIntent,
  type CategoryKeywords,
  type KeywordSubGroup,
} from "@/lib/admin-naver-datalab-keywords";
import { isBlogCategorySlug } from "@/lib/blog";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useAdminApi, forceRefetchAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminErrorState } from "../AdminErrorState";
import type { CategoryTrendData } from "@/lib/trend-analysis";
import type { TrendOverviewCategory, TrendSummaryData } from "./shared";
import { ApiSourceBadge } from "./ApiSourceBadge";
import { KeywordCandidateReview } from "./KeywordCandidateReview";
import type { SearchAdSyncState } from "@/lib/admin-searchad-snapshots";

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

function formatSnapshotDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  const contentCategories = [...new Set(cat.subGroups.map((group) => getBlogCategoryForKeywordTopic(cat.slug, group.name)))];
  const isAnalysisOnly = contentCategories.length !== 1 || contentCategories[0] !== cat.slug;

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
      {isAnalysisOnly && (
        <p className="mt-0.5 text-[10px] font-medium text-amber-700">
          발행 · {contentCategories.map(getKeywordCategoryLabel).join(" · ")}
        </p>
      )}

      {/* Monthly volume */}
      {trendInfo?.monthlyTotalVolume != null ? (
        <div className="mt-1" title="카테고리 내 모든 핵심 키워드의 주제 검색량 합계">
          <span className="text-[10px] font-medium text-[var(--muted)]">주제 검색량</span>
          <p className="text-lg font-bold text-[var(--foreground)] tabular-nums leading-tight">
            {trendInfo.monthlyTotalVolume.toLocaleString("ko-KR")}
            <span className="ml-0.5 text-xs font-normal text-[var(--muted)]">/월</span>
          </p>
        </div>
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
          {sg.keywords.map((kw) => {
            const isMatch = q && kw.toLowerCase().includes(q);
            return (
              <span
                key={kw}
                className={`inline-block rounded-md px-2 py-1 text-xs ${
                  isMatch
                    ? "bg-yellow-100 text-yellow-800 font-medium"
                    : "bg-primary/10 text-primary font-medium border border-primary/20"
                }`}
              >
                {kw}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          모든 핵심 키워드의 검색량을 합산해 주제 검색량을 계산합니다.
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
        <div className={`rounded-xl border-2 px-4 py-3 ${
          activeSummary.weightedAvg > 0
            ? "border-green-200 bg-green-50"
            : activeSummary.weightedAvg < 0
              ? "border-red-200 bg-red-50"
              : "border-gray-200 bg-gray-50"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">네이버 검색 트렌드</span>
            <span className={`text-2xl font-bold tabular-nums ${
              activeSummary.weightedAvg > 0 ? "text-green-600" : activeSummary.weightedAvg < 0 ? "text-red-600" : "text-gray-500"
            }`}>
              {activeSummary.weightedAvg > 0 ? "▲" : activeSummary.weightedAvg < 0 ? "▼" : "—"}{" "}
              {activeSummary.weightedAvg > 0 ? "+" : ""}{activeSummary.weightedAvg.toFixed(1)}%
            </span>
            <span className="text-xs text-[var(--muted)]">
              편차 {activeSummary.stdDev.toFixed(1)}%
              {activeSummary.stdDev < 10 ? " · 균일" : " · 편차 큼"}
            </span>
            <span className="text-xs text-[var(--muted)]">서브그룹 {activeSummary.count}개</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            네이버 DataLab 상대 트렌드 변화율을 검색광고 API 월간 검색량으로 가중평균한 추정치입니다. 검색량이 많은 키워드의 변화가 더 크게 반영됩니다.
          </p>
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold text-[var(--muted)]">서브그룹별 트렌드</h4>
          <span className="text-[10px] text-[var(--muted)]">검색량 숫자 = 핵심 키워드 전체의 주제 검색량</span>
        </div>
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
              <span
                className={`w-14 shrink-0 text-right text-xs tabular-nums ${
                  sg.changeRate > 0 ? "text-green-600" : sg.changeRate < 0 ? "text-red-600" : "text-gray-400"
                }`}
              >
                {sg.changeRate > 0 ? "+" : ""}
                {sg.changeRate.toFixed(1)}%
              </span>
              {(() => {
                const normPct = activeSummary
                  ? ((1 + sg.changeRate / 100) / (1 + activeSummary.weightedAvg / 100) - 1) * 100
                  : sg.changeRate;
                const normTrend = normPct > 0.5 ? "rising" : normPct < -0.5 ? "falling" : "stable";
                return (
                  <>
                    <span
                      className={`w-16 shrink-0 text-right text-xs tabular-nums ${
                        normTrend === "rising" ? "text-blue-600" : normTrend === "falling" ? "text-orange-500" : "text-gray-400"
                      }`}
                      title="플랫폼 대비 정규화 변화율"
                    >
                      {normPct > 0 ? "+" : ""}{normPct.toFixed(1)}%
                    </span>
                    <TrendIcon trend={normTrend} />
                  </>
                );
              })()}
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
  changeRate,
  platformAvg,
}: {
  cat: CategoryKeywords;
  filter: string;
  volumeMap: Map<string, number>;
  shortTermDetail: CategoryTrendData[] | undefined;
  longTermDetail: CategoryTrendData[] | undefined;
  loading: boolean;
  shortTermSummary: TrendSummaryResult;
  longTermSummary: TrendSummaryResult;
  changeRate?: number;
  platformAvg?: number;
}) {
  const [showTrend, setShowTrend] = useState(false);
  const totalKw = cat.subGroups.reduce((s, g) => s + g.keywords.length, 0);
  const contentCategories = [...new Set(cat.subGroups.map((group) => getBlogCategoryForKeywordTopic(cat.slug, group.name)))];
  const isAnalysisOnly = contentCategories.length !== 1 || contentCategories[0] !== cat.slug;

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
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">
              {getKeywordCategoryLabel(cat.slug)}
              <span className="ml-2 text-sm font-normal text-gray-400">
                {cat.slug}
              </span>
            </h3>
            {changeRate != null && (() => {
              const normPct = platformAvg != null
                ? ((1 + changeRate / 100) / (1 + platformAvg / 100) - 1) * 100
                : null;
              const normTrend = normPct != null
                ? (normPct > 0.5 ? "rising" : normPct < -0.5 ? "falling" : "stable")
                : null;
              return (
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${
                    changeRate > 0
                      ? "bg-green-100 text-green-700"
                      : changeRate < 0
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                  }`}>
                    {changeRate > 0 ? "+" : ""}{changeRate.toFixed(1)}%
                  </span>
                  {normPct != null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                        normTrend === "rising"
                          ? "bg-blue-50 text-blue-600"
                          : normTrend === "falling"
                            ? "bg-orange-50 text-orange-500"
                            : "bg-gray-50 text-gray-400"
                      }`}
                      title="전체 대비 정규화 변화율"
                    >
                      {normPct > 0 ? "+" : ""}{normPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <p className="text-xs text-gray-500">
            {cat.subGroups.length}개 서브그룹 · {totalKw}개 키워드
            {isAnalysisOnly ? ` · 공개 콘텐츠는 ${contentCategories.map(getKeywordCategoryLabel).join("·")}에 발행` : ""}
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
const SEARCHAD_SYNC_ENDPOINT = "/api/admin/naver-searchad/sync";

interface TaxonomyGovernanceSummary {
  active: { version: number | null; keywords: number; subgroups: number };
  pending: { version: number; keywords: number; subgroups: number } | null;
  pendingCandidateCount: number;
}

export function TaxonomySubTab() {
  const [workspace, setWorkspace] = useState<"taxonomy" | "candidates">("taxonomy");
  const [selectedCategory, setSelectedCategory] =
    useState<KeywordCategorySlug | null>(null);
  const [filter, setFilter] = useState("");
  const [forceLoading, setForceLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const observedActiveJob = useRef<string | null>(null);

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
  const searchAdSync = useAdminApi<SearchAdSyncState>(SEARCHAD_SYNC_ENDPOINT);
  const taxonomyGovernance = useAdminApi<TaxonomyGovernanceSummary>("/api/admin/keyword-taxonomy/state");
  const refetchTaxonomyGovernance = taxonomyGovernance.refetch;
  const {
    mutate: startSearchAdSync,
    loading: startingSearchAdSync,
    error: searchAdSyncMutationError,
  } = useAdminMutation<SearchAdSyncState>();
  const searchAdSyncActive = searchAdSync.data?.status === "queued" || searchAdSync.data?.status === "running";
  const searchAdJobId = searchAdSync.data?.jobId ?? null;
  const refetchSearchAdSync = searchAdSync.refetch;

  useEffect(() => {
    if (!searchAdSyncActive) return;
    observedActiveJob.current = searchAdJobId;
    const timer = window.setInterval(() => refetchSearchAdSync(), 3_000);
    return () => window.clearInterval(timer);
  }, [refetchSearchAdSync, searchAdJobId, searchAdSyncActive]);

  useEffect(() => {
    if (searchAdSync.data?.status !== "completed" || !searchAdSync.data.jobId) return;
    if (observedActiveJob.current !== searchAdSync.data.jobId) return;
    observedActiveJob.current = null;
    refetchTaxonomyGovernance();
    void Promise.all([
      forceRefetchAdminApi<TrendSummaryData>(VOLUME_ENDPOINT),
      forceRefetchAdminApi<TrendSummaryData>(TREND_SHORT_ENDPOINT),
      forceRefetchAdminApi<TrendSummaryData>(TREND_LONG_ENDPOINT),
    ]);
  }, [refetchTaxonomyGovernance, searchAdSync.data?.jobId, searchAdSync.data?.status]);

  // 세 결과를 병합
  const overviewData = useMemo(() => {
    // taxonomyMeta가 없는 응답은 유효하지 않으므로 무시
    const validVolume = volumeData?.taxonomyMeta ? volumeData : null;
    const validShort = trendShortData?.taxonomyMeta ? trendShortData : null;
    if (!validVolume && !validShort) return null;
    return {
      ...(validVolume ?? validShort)!,
      shortTermDetail: validShort?.shortTermDetail ?? validVolume?.shortTermDetail,
      longTermDetail: trendLongData?.longTermDetail ?? validShort?.longTermDetail,
      categories: (validShort?.categories ?? validVolume?.categories)?.map((cat) => {
        const volCat = validVolume?.categories?.find((c) => c.slug === cat.slug);
        return {
          ...cat,
          monthlyTotalVolume: cat.monthlyTotalVolume ?? volCat?.monthlyTotalVolume,
          subGroupVolumes: cat.subGroupVolumes ?? volCat?.subGroupVolumes,
        };
      }),
    };
  }, [volumeData, trendShortData, trendLongData]);

  const overviewLoading = volumeLoading;
  const overviewError = volumeError;
  const keywordTaxonomy = overviewData?.keywordTaxonomy ?? CATEGORY_KEYWORDS;

  const handleForceRefresh = useCallback(async () => {
    setForceLoading(true);
    try {
      const syncResult = await startSearchAdSync(SEARCHAD_SYNC_ENDPOINT, "POST");
      if (syncResult.data?.jobId) {
        observedActiveJob.current = syncResult.data.jobId;
        refetchSearchAdSync();
      }
    } catch {
      // 에러는 SWR이 처리
    } finally {
      setForceLoading(false);
    }
  }, [refetchSearchAdSync, startSearchAdSync]);

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

  // Per-category weighted average change rate (서브그룹 검색량 가중평균)
  const catChangeRateMap = useMemo(() => {
    const map = new Map<KeywordCategorySlug, number>();
    const detail = overviewData?.shortTermDetail;
    if (!detail) return map;
    for (const catData of detail) {
      const catOverview = overviewData?.categories?.find((c) => c.slug === catData.slug);
      const sgVolumes = catOverview?.subGroupVolumes;
      if (!sgVolumes) continue;
      let totalVol = 0;
      let weightedSum = 0;
      for (const sg of catData.subGroups) {
        const vol = sgVolumes[sg.name] ?? 0;
        if (vol <= 0) continue;
        weightedSum += sg.changeRate * vol;
        totalVol += vol;
      }
      if (totalVol > 0) map.set(catData.slug, weightedSum / totalVol);
    }
    return map;
  }, [overviewData]);

  // Volume map for selected category
  const selectedVolumeMap = useMemo(() => {
    const map = new Map<string, number>();
    if (overviewData && selectedCategory) {
      for (const gap of overviewData.contentGap) {
        if (gap.slug === selectedCategory && gap.monthlyVolume != null) {
          map.set(gap.subGroup, gap.monthlyVolume);
        }
      }
    }
    return map;
  }, [overviewData, selectedCategory]);

  // Sort categories by monthly volume (descending) when data available
  const sortedCategories = useMemo(() => {
    if (trendInfoMap.size === 0) return keywordTaxonomy;
    return [...keywordTaxonomy].sort((a, b) => {
      const va = trendInfoMap.get(a.slug)?.monthlyTotalVolume ?? -1;
      const vb = trendInfoMap.get(b.slug)?.monthlyTotalVolume ?? -1;
      return vb - va;
    });
  }, [keywordTaxonomy, trendInfoMap]);

  const selectedCat = useMemo(
    () => keywordTaxonomy.find((c) => c.slug === selectedCategory) ?? null,
    [keywordTaxonomy, selectedCategory]
  );

  // 트렌드 요약 계산 헬퍼
  const calcSummary = useCallback(
    (detail: CategoryTrendData[] | undefined) => {
      if (!detail || detail.length === 0) return null;
      const items: Array<{ changeRate: number; volume: number }> = [];
      for (const cat of detail) {
        const catOverview = overviewData?.categories?.find((c) => c.slug === cat.slug);
        if (!catOverview) continue;
        const volumeMap = catOverview.subGroupVolumes;
        for (const sg of cat.subGroups) {
          const volume = volumeMap?.[sg.name] ?? 0;
          if (volume <= 0) continue;
          items.push({ changeRate: sg.changeRate, volume });
        }
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
  const snapshotIsStale = searchAdSync.data?.snapshotCreatedAt
    ? Date.now() - new Date(searchAdSync.data.snapshotCreatedAt).getTime() > 26 * 60 * 60 * 1000
    : false;
  const snapshotVersionMismatch = taxonomyGovernance.data?.active.version != null
    && searchAdSync.data?.snapshotTaxonomyVersion != null
    && taxonomyGovernance.data.active.version !== searchAdSync.data.snapshotTaxonomyVersion;

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["naverDatalab", "naverSearchAd"]} />

      <div className="flex gap-2 border-b border-[var(--border)] pb-3">
        <button type="button" onClick={() => setWorkspace("taxonomy")} className={`rounded-lg px-4 py-2 text-sm font-medium ${workspace === "taxonomy" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--background)] text-[var(--muted)]"}`}>
          키워드·트렌드
        </button>
        <button type="button" onClick={() => setWorkspace("candidates")} className={`rounded-lg px-4 py-2 text-sm font-medium ${workspace === "candidates" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--background)] text-[var(--muted)]"}`}>
          후보 검토{taxonomyGovernance.data ? ` (${taxonomyGovernance.data.pendingCandidateCount})` : ""}
          {taxonomyGovernance.data?.pending && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">v{taxonomyGovernance.data.pending.version} 대기</span>}
        </button>
      </div>

      {searchAdSync.data?.status === "failed" && (
        <AdminNotice tone="error">최근 통합 수집에 실패했습니다. 기존 활성 데이터는 유지되고 있습니다: {searchAdSync.data.error ?? "원인을 확인할 수 없습니다."}</AdminNotice>
      )}
      {overviewData?.taxonomyMeta?.source === "code-fallback" && (
        <AdminNotice tone="warning">Supabase 활성 택소노미를 불러오지 못해 빌드 시점 fallback을 사용하고 있습니다. 통합 데이터 갱신 전에 연결 상태를 확인하세요.</AdminNotice>
      )}
      {snapshotVersionMismatch && (
        <AdminNotice tone="warning">활성 택소노미 v{taxonomyGovernance.data?.active.version}와 분석 스냅샷 v{searchAdSync.data?.snapshotTaxonomyVersion}가 다릅니다. 데이터 갱신을 실행하세요.</AdminNotice>
      )}
      {snapshotIsStale && (
        <AdminNotice tone="warning">마지막 통합 수집 후 26시간 이상 지났습니다. Cron 상태를 확인하거나 데이터 갱신을 실행하세요.</AdminNotice>
      )}
      {searchAdSync.data?.candidateAnalysisStatus === "failed" && (
        <AdminNotice tone="warning">통합 데이터는 정상 게시됐지만 키워드 후보 자동 분석에 실패했습니다. 후보 검토 탭의 ‘후보 다시 분석’을 실행하세요: {searchAdSync.data.candidateAnalysisError ?? "원인을 확인할 수 없습니다."}</AdminNotice>
      )}

      {workspace === "candidates" ? (
        <KeywordCandidateReview taxonomy={keywordTaxonomy} />
      ) : <>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">키워드 택소노미</h2>
        <button
          type="button"
          onClick={handleForceRefresh}
          disabled={forceLoading || startingSearchAdSync || searchAdSyncActive || overviewLoading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={forceLoading || startingSearchAdSync || searchAdSyncActive ? "animate-spin" : ""} />
          {startingSearchAdSync ? "갱신 시작 중" : searchAdSyncActive ? "통합 데이터 수집 중" : "데이터 갱신"}
        </button>
      </div>

      {searchAdSync.data?.snapshotCreatedAt && (
        <p className="-mt-4 text-right text-[11px] text-[var(--muted)]">
          택소노미 {overviewData?.taxonomyMeta?.version ? `v${overviewData.taxonomyMeta.version}` : "코드 fallback"}
          {` · 통합 스냅샷 ${formatSnapshotDate(searchAdSync.data.snapshotCreatedAt)} · 핵심 키워드 ${searchAdSync.data.snapshotKeywordCount?.toLocaleString("ko-KR")}개`}
          {searchAdSync.data.candidateAnalyzedAt ? ` · 후보 분석 ${formatSnapshotDate(searchAdSync.data.candidateAnalyzedAt)}` : ""}
        </p>
      )}

      {(searchAdSyncMutationError || searchAdSync.data?.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {searchAdSyncMutationError ?? searchAdSync.data?.error}
        </div>
      )}

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            changeRate={catChangeRateMap.get(selectedCat.slug)}
            platformAvg={shortTermSummary?.weightedAvg}
          />
        </section>
      )}
      </>}
    </div>
  );
}
