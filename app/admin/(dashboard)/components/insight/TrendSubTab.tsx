"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TrendingUp, TrendingDown, Minus, X, AlertCircle, Smartphone, UserRound, CalendarRange } from "lucide-react";
import {
  getKeywordCategoryLabel,
  type KeywordCategorySlug,
} from "@/lib/admin-naver-datalab-keywords";
import { isBlogCategorySlug } from "@/lib/blog";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { useAdminApi } from "../useAdminApi";
import { PeriodSelector } from "../PeriodSelector";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import type { TrendInsightsData, TrendOverviewCategory, TrendSummaryData } from "./shared";

// ---------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------

interface SubGroupDetail {
  name: string;
  trend: "rising" | "falling" | "stable";
  changeRate: number;
  currentAvg: number;
  data: Array<{ period: string; ratio: number }>;
}

interface CategoryDetailData {
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  period: { start: string; end: string };
  timeUnit: string;
  subGroups: SubGroupDetail[];
}

// ---------------------------------------------------------------
// Sub-group line chart
// ---------------------------------------------------------------

const SUB_GROUP_COLORS = [
  "#2563EB", "#C9962B", "#16A34A", "#9333EA", "#0891B2",
  "#DC2626", "#EA580C", "#D946EF", "#65A30D",
];

interface SubGroupChartProps {
  subGroups: SubGroupDetail[];
}

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
          String(a.period).localeCompare(String(b.period)),
        );
        const formatDate = (value: string) => {
          if (!value) return "";
          const parts = value.split("-");
          if (parts.length === 2) return `${parts[0].slice(2)}.${Number(parts[1])}`;
          return `${Number(parts[1])}/${Number(parts[2])}`;
        };
        return (
          <mod.ResponsiveContainer width="100%" height={280}>
            <mod.LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <mod.XAxis dataKey="period" tickFormatter={formatDate} tick={{ fontSize: 11, fill: "#6B7280" }} interval="preserveStartEnd" />
              <mod.YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={36} domain={[0, 100]} />
              <mod.Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={((label: string) => label) as any}
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
    trend === "rising" ? "text-green-600" : trend === "falling" ? "text-red-600" : "text-gray-500";
  const sign = changeRate > 0 ? "+" : "";
  return (
    <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
      {sign}{changeRate.toFixed(1)}%
    </span>
  );
}

// ---------------------------------------------------------------
// Category overview card
// ---------------------------------------------------------------

interface CategoryCardProps {
  cat: TrendOverviewCategory;
  isSelected: boolean;
  onClick: () => void;
  onRetry: () => void;
}

function CategoryCard({ cat, isSelected, onClick, onRetry }: CategoryCardProps) {
  if (cat.error) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
          <span className="text-sm font-semibold text-[var(--muted)]">{getKeywordCategoryLabel(cat.category)}</span>
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

  const hasTrend = cat.overallTrend != null;
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
      aria-label={`${getKeywordCategoryLabel(cat.category)} 트렌드 상세 보기`}
    >
      <div className="mb-1">
        <span className="text-sm font-semibold text-[var(--foreground)]">{getKeywordCategoryLabel(cat.category)}</span>
      </div>
      {cat.monthlyTotalVolume != null ? (
        <p className="text-lg font-bold text-[var(--foreground)] tabular-nums leading-tight">
          {cat.monthlyTotalVolume.toLocaleString("ko-KR")}
          <span className="ml-0.5 text-xs font-normal text-[var(--muted)]">/월</span>
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">검색량 미연동</p>
      )}
      {hasTrend ? (
        <>
          <div className="mt-1 flex items-center gap-1">
            <TrendIcon trend={trend} />
            <span className={`text-xs tabular-nums ${trend === "rising" ? "text-green-600" : trend === "falling" ? "text-red-600" : "text-gray-500"}`}>
              {changeRate > 0 ? "+" : ""}{changeRate.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            상승 {risingCount}개
            {cat.topSubGroup && <> · 톱: {cat.topSubGroup}</>}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--muted)]">
          서브그룹 {cat.subGroupCount ?? 0}개
        </p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------
// Category drilldown detail
// ---------------------------------------------------------------

interface CategoryDetailProps {
  slug: KeywordCategorySlug;
  period: string;
  onClose: () => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
  volumeMap: Map<string, number>;
  onOpenStrategy: (slug: KeywordCategorySlug) => void;
  onCreatePost: (slug: KeywordCategorySlug) => void;
}

function CategoryDetail({
  slug,
  period,
  onClose,
  detailRef,
  volumeMap,
  onOpenStrategy,
  onCreatePost,
}: CategoryDetailProps) {
  const { data, loading, error, refetch } = useAdminApi<CategoryDetailData>(
    `/api/admin/naver-datalab/category/${slug}?period=${period}`,
  );

  return (
    <div ref={detailRef} className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {data ? `${getKeywordCategoryLabel(data.category)} 상세 흐름` : "상세 흐름 로딩 중..."}
        </h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors" aria-label="상세 닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
      {loading && <AdminLoadingSkeleton variant="chart" />}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <AdminActionButton tone="primary" onClick={() => onOpenStrategy(slug)} className="min-h-8 px-3 py-1 text-xs">
              콘텐츠 전략
            </AdminActionButton>
            {isBlogCategorySlug(slug) && (
              <AdminActionButton tone="dark" onClick={() => onCreatePost(slug)} className="min-h-8 px-3 py-1 text-xs">
                새 글 작성
              </AdminActionButton>
            )}
          </div>
          <div className="mb-4 rounded-xl bg-[var(--background)] p-4">
            <SubGroupLineChart subGroups={data.subGroups} />
          </div>
          <div className="space-y-2">
            {(() => {
              const maxVol = Math.max(...data.subGroups.map((s) => volumeMap.get(s.name) ?? 0), 1);
              return data.subGroups
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
                const barWidth = vol != null ? `${Math.min(100, (vol / maxVol) * 100)}%` : `${Math.min(100, sg.currentAvg)}%`;
                const barColor = SUB_GROUP_COLORS[idx % SUB_GROUP_COLORS.length];
                return (
                  <div key={sg.name} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-xs text-[var(--muted)]" title={sg.name}>{sg.name}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-[var(--border)] h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: barWidth, backgroundColor: barColor }} />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-[var(--muted)] tabular-nums">
                      {vol != null ? vol.toLocaleString("ko-KR") : sg.currentAvg.toFixed(1)}
                    </span>
                    <TrendText trend={sg.trend} changeRate={sg.changeRate} />
                  </div>
                );
              });
            })()}
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
// Main TrendSubTab component
// ---------------------------------------------------------------

export function TrendSubTab() {
  const router = useRouter();
  const [period, setPeriod] = useState<"1m" | "3m" | "1y" | "3y" | "10y">("3m");
  const [selectedCategory, setSelectedCategory] = useState<KeywordCategorySlug | null>(null);

  const detailRef = useRef<HTMLDivElement | null>(null);

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useAdminApi<TrendSummaryData>(
    `/api/admin/naver-datalab/trend-summary?period=${period}&mode=full`,
  );
  const {
    data: insightsData,
    loading: insightsLoading,
    error: insightsError,
  } = useAdminApi<TrendInsightsData>(
    `/api/admin/naver-datalab/trend-insights?period=${period}`,
  );

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "1m" | "3m" | "1y" | "3y" | "10y");
    setSelectedCategory(null);
  };

  const handleCategoryClick = (slug: KeywordCategorySlug) => {
    if (selectedCategory === slug) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory(slug);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Volume map for selected category drilldown
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
  const segmentInsights = insightsData?.segmentInsights ?? [];
  const seasonalityInsights = insightsData?.seasonalityInsights ?? [];

  // ── Graceful degradation ─────────────────────────────────────
  if (!overviewLoading && !overviewError && overviewData === null) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <p className="text-sm text-[var(--muted)]">
          네이버 DataLab API 키가 설정되지 않았습니다. 환경변수{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_ID</code>{" "}
          와{" "}
          <code className="rounded bg-[var(--background)] px-1 py-0.5 text-xs">NAVER_DATALAB_CLIENT_SECRET</code>{" "}
          을 설정해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverDatalab"]} />

      {/* ── Period selector ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector periods={PERIODS} selected={period} onChange={handlePeriodChange} />
        {overviewData?.period && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            {overviewData.period.start} ~ {overviewData.period.end}
          </span>
        )}
      </div>

      {/* ── Category overview cards ────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          검색 수요 개요
        </h2>
        {overviewLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-2 h-4 w-20 rounded bg-[var(--border)]" />
                <div className="h-5 w-16 rounded bg-[var(--border)]" />
                <div className="mt-1.5 h-3 w-24 rounded bg-[var(--border)]" />
              </div>
            ))}
          </div>
        )}
        {overviewError && <AdminErrorState message={overviewError} onRetry={refetchOverview} />}
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

      {/* ── Category drilldown ─────────────────────────── */}
      {selectedCategory && (
        <section>
          <CategoryDetail
            slug={selectedCategory}
            period={period}
            onClose={() => setSelectedCategory(null)}
            detailRef={detailRef}
            volumeMap={selectedVolumeMap}
            onOpenStrategy={() => router.push("/admin/content/strategy")}
            onCreatePost={(slug) => {
              if (!isBlogCategorySlug(slug)) return;
              router.push(`/admin/content/posts/new?category=${slug}`);
            }}
          />
        </section>
      )}

      {!overviewLoading && !overviewError && overviewData && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">기기</h2>
            </div>
            <div className="space-y-3">
              {insightsLoading && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">계산 중...</p>
              )}
              {segmentInsights.slice(0, 3).map((item) => (
                <div key={`${item.slug}-device`} className="rounded-xl bg-[var(--background)] px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {getKeywordCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs font-semibold text-[var(--foreground)]">{item.subGroup}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {item.device.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {item.device.changeRate > 0 ? "+" : ""}{item.device.changeRate.toFixed(1)}%
                  </p>
                </div>
              ))}
              {!insightsLoading && segmentInsights.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">데이터 없음</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">타깃층</h2>
            </div>
            <div className="space-y-3">
              {insightsLoading && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">계산 중...</p>
              )}
              {segmentInsights.slice(0, 3).map((item) => (
                <div key={`${item.slug}-audience`} className="rounded-xl bg-[var(--background)] px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {getKeywordCategoryLabel(item.category)}
                    </span>
                    <span className="text-xs font-semibold text-[var(--foreground)]">{item.subGroup}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {item.gender.label} · {item.age.label}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.note}</p>
                </div>
              ))}
              {!insightsLoading && segmentInsights.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">데이터 없음</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">시즌성</h2>
            </div>
            <div className="space-y-3">
              {insightsLoading && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">계산 중...</p>
              )}
              {seasonalityInsights.slice(0, 3).map((item) => (
                <div key={`${item.slug}-seasonality`} className="rounded-xl bg-[var(--background)] px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {getKeywordCategoryLabel(item.category)}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {item.confidence.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {item.peakMonths.join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">약세 {item.lowMonths.join(" · ")}</p>
                </div>
              ))}
              {!insightsLoading && seasonalityInsights.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--muted)]">데이터 없음</p>
              )}
            </div>
          </div>
        </section>
      )}

      {!insightsLoading && insightsError && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-sm text-[var(--muted)]">{insightsError}</p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────── */}
      {!overviewLoading && !overviewError && overviewData &&
        overviewData.categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            카테고리 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
