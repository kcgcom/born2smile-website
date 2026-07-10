"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Hash,
  Layers,
  Search,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  AlertCircle,
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
import { useAdminApi } from "../useAdminApi";
import { PeriodSelector } from "../PeriodSelector";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import type { TrendOverviewCategory, TrendSummaryData } from "./shared";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const INTENT_LABELS: Record<SearchIntent, string> = {
  informational: "정보",
  commercial: "상업",
  transactional: "거래",
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

const PERIODS = [
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "10y", label: "10년" },
];

const SUB_GROUP_COLORS = [
  "#2563EB", "#C9962B", "#16A34A", "#9333EA", "#0891B2",
  "#DC2626", "#EA580C", "#D946EF", "#65A30D",
];

// ---------------------------------------------------------------
// Trend types (from TrendSubTab)
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

interface SubGroupChartProps {
  subGroups: SubGroupDetail[];
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
}: {
  cat: CategoryKeywords;
  isSelected: boolean;
  onClick: () => void;
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
      <p className="mt-0.5 text-xs text-gray-400">{cat.slug}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
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

function TrendView({
  slug,
  volumeMap,
}: {
  slug: KeywordCategorySlug;
  volumeMap: Map<string, number>;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<string>("3m");
  const { data, loading, error, refetch } = useAdminApi<CategoryDetailData>(
    `/api/admin/naver-datalab/category/${slug}?period=${period}`,
  );

  if (loading) return <AdminLoadingSkeleton variant="chart" />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector
          periods={PERIODS}
          selected={period}
          onChange={(v) => setPeriod(v)}
        />
        <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
          {data.period.start} ~ {data.period.end}
        </span>
      </div>

      {/* Line chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <SubGroupLineChart subGroups={data.subGroups} />
      </div>

      {/* SubGroup bars with volume */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 space-y-2">
        <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">서브그룹별 트렌드</h4>
        {data.subGroups.map((sg, idx) => {
          const vol = volumeMap.get(sg.name);
          const maxAvg = Math.max(...data.subGroups.map((s) => s.currentAvg), 1);
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
  onBack,
  filter,
  volumeMap,
}: {
  cat: CategoryKeywords;
  onBack: () => void;
  filter: string;
  volumeMap: Map<string, number>;
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
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          전체
        </button>
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
        <TrendView slug={cat.slug} volumeMap={volumeMap} />
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

export function TaxonomySubTab() {
  const [selectedCategory, setSelectedCategory] =
    useState<KeywordCategorySlug | null>(null);
  const [filter, setFilter] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  // Fetch trend overview for volume data (lazy — only when a category is selected)
  const { data: overviewData } = useAdminApi<TrendSummaryData>(
    `/api/admin/naver-datalab/trend-summary?period=3m&mode=full`,
    !!selectedCategory,
  );

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

  const stats = useMemo(() => {
    const totalGroups = CATEGORY_KEYWORDS.reduce(
      (s, c) => s + c.subGroups.length,
      0
    );
    const totalKw = CATEGORY_KEYWORDS.reduce(
      (s, c) => s + c.subGroups.reduce((ss, g) => ss + g.keywords.length, 0),
      0
    );
    return { categories: CATEGORY_KEYWORDS.length, totalGroups, totalKw };
  }, []);

  const selectedCat = useMemo(
    () => CATEGORY_KEYWORDS.find((c) => c.slug === selectedCategory) ?? null,
    [selectedCategory]
  );

  // Scroll to detail when category selected
  useEffect(() => {
    if (selectedCat && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedCat]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">키워드 택소노미</h2>
        <p className="mt-1 text-sm text-gray-500">
          {stats.categories}개 카테고리 · {stats.totalGroups}개 서브그룹 ·{" "}
          {stats.totalKw}개 키워드
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "카테고리", value: stats.categories, icon: Hash },
          { label: "서브그룹", value: stats.totalGroups, icon: Layers },
          { label: "키워드", value: stats.totalKw, icon: Tag },
        ].map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <StatIcon size={18} className="text-primary" />
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Category card grid */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리 개요
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_KEYWORDS.map((cat) => (
            <CategoryCard
              key={cat.slug}
              cat={cat}
              isSelected={selectedCategory === cat.slug}
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
            onBack={() => {
              setSelectedCategory(null);
              setFilter("");
            }}
            filter={filter}
            volumeMap={selectedVolumeMap}
          />
        </section>
      )}
    </div>
  );
}
