"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAdminApi } from "../useAdminApi";
import { DataTable } from "../DataTable";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { categoryColors } from "@/lib/blog/category-colors";
import type { BlogCategoryValue } from "@/lib/blog/types";
import { ApiSourceBadge } from "./ApiSourceBadge";

// ---------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------

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
  directKeywords?: Array<{ keyword: string; volume: number }>;
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
  mode: "volume" | "full";
  period: { start: string; end: string } | null;
  categories: unknown[];
  contentGap: ContentGapItem[];
  suggestions: TopicSuggestionItem[];
  volumeSource: "searchad" | "datalab-fallback";
  volumeCoverage: number | null;
}

// ---------------------------------------------------------------
// Opportunity Scatter Chart
// ---------------------------------------------------------------

const CATEGORY_SCATTER_COLORS: Record<string, string> = {
  "임플란트": "#2563EB",
  "치아교정": "#C9962B",
  "보철치료": "#16A34A",
  "보존치료": "#9333EA",
  "예방관리": "#0891B2",
  "소아치료": "#DC2626",
  "건강상식": "#EA580C",
  "치과선택": "#D946EF",
};

interface ScatterPoint {
  subGroup: string;
  category: string;
  slug: string;
  x: number;
  y: number;
  z: number;
}

const OpportunityScatter = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data, onPointClick }: { data: ScatterPoint[]; onPointClick: (slug: string) => void }) {
        if (data.length === 0) {
          return (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              검색량 데이터가 있는 항목이 없습니다
            </p>
          );
        }

        const categories = [...new Set(data.map((d) => d.category))];

        return (
          <div>
            <mod.ResponsiveContainer width="100%" height={360}>
              <mod.ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: 4 }}>
                <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <mod.XAxis
                  type="number"
                  dataKey="x"
                  name="검색량"
                  scale="log"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  label={{ value: "월 검색량", position: "bottom", offset: 4, fontSize: 11, fill: "#6B7280" }}
                />
                <mod.YAxis
                  type="number"
                  dataKey="y"
                  name="포스트 수"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  label={{ value: "포스트 수", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#6B7280" }}
                />
                <mod.ZAxis type="number" dataKey="z" range={[60, 400]} />
                <mod.Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload as ScatterPoint;
                    return (
                      <div className="rounded-lg border border-[var(--border)] bg-white p-2 shadow text-xs">
                        <p className="font-semibold">{d.subGroup}</p>
                        <p className="text-[var(--muted)]">{d.category}</p>
                        <p>검색량: {d.x.toLocaleString("ko-KR")}/월</p>
                        <p>포스트: {d.y}개</p>
                        <p>갭 점수: {d.z.toFixed(0)}</p>
                      </div>
                    );
                  }}
                />
                {categories.map((cat) => (
                  <mod.Scatter
                    key={cat}
                    name={cat}
                    data={data.filter((d) => d.category === cat)}
                    fill={CATEGORY_SCATTER_COLORS[cat] ?? "#6B7280"}
                    fillOpacity={0.7}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={(point: any) => {
                      if (point?.slug) onPointClick(point.slug);
                    }}
                    cursor="pointer"
                  />
                ))}
                <mod.Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </mod.ScatterChart>
            </mod.ResponsiveContainer>
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              좌상단(검색량 높음 + 포스트 적음) = 기회 영역 · 점 크기 = 갭 점수 · 클릭하면 새 포스트 작성
            </p>
          </div>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------

function GapScoreBadge({ score }: { score: number }) {
  if (score >= 70) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">HIGH</span>;
  }
  if (score >= 40) {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">MED</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">LOW</span>;
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">HIGH</span>;
  }
  if (priority === "medium") {
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">MED</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">LOW</span>;
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
// Sort state management for content gap table
// ---------------------------------------------------------------

type GapSortKey = "gapScore" | "existingPostCount" | "currentAvg" | "monthlyVolume";

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
// Main StrategySubTab component
// ---------------------------------------------------------------

export function StrategySubTab() {
  const router = useRouter();

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
  } = useAdminApi<OverviewData>("/api/admin/naver-datalab/overview?mode=volume");

  const { sortKey: gapSortKey, sortDirection: gapSortDir, handleSort: handleGapSort, sort: sortGapRows } =
    useGapTableSort("monthlyVolume");

  const handleNewPost = (slug: string) => {
    router.push(`/admin?tab=blog&newCategory=${slug}`);
  };

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

  if (overviewLoading) {
    return <AdminLoadingSkeleton variant="full" />;
  }

  if (overviewError) {
    return <AdminErrorState message={overviewError} />;
  }

  if (!overviewData) return null;

  const gapRows = sortGapRows(overviewData.contentGap).map((item) => ({
    ...item,
    id: `${item.slug}-${item.subGroup}`,
  }));

  const maxVolume = Math.max(
    ...overviewData.contentGap.map(
      (g) => (g.monthlyVolume ?? 0) + (g.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0),
    ),
    1,
  );

  const suggestions = overviewData.suggestions;

  // ── Scatter data ─────────────────────────────────────────────
  const scatterData: ScatterPoint[] = overviewData.contentGap
    .filter((g) => g.monthlyVolume != null)
    .map((g) => ({
      subGroup: g.subGroup,
      category: g.category,
      slug: g.slug,
      x: (g.monthlyVolume ?? 0) + (g.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0),
      y: g.existingPostCount,
      z: g.gapScore,
    }))
    .filter((d) => d.x > 0);

  // ── Cross-keyword analysis ───────────────────────────────────
  const crossKeywords = (() => {
    const kwCatMap = new Map<string, { categories: Set<string>; volume: number }>();
    for (const gap of overviewData.contentGap) {
      for (const kw of [...(gap.directKeywords ?? []), ...(gap.relatedKeywords ?? [])]) {
        const entry = kwCatMap.get(kw.keyword) ?? { categories: new Set(), volume: 0 };
        entry.categories.add(gap.category);
        entry.volume = Math.max(entry.volume, kw.volume);
        kwCatMap.set(kw.keyword, entry);
      }
    }
    return [...kwCatMap.entries()]
      .filter(([, v]) => v.categories.size >= 2)
      .sort((a, b) => b[1].categories.size - a[1].categories.size || b[1].volume - a[1].volume)
      .slice(0, 20)
      .map(([keyword, v]) => ({
        keyword,
        categories: [...v.categories],
        categoryCount: v.categories.size,
        volume: v.volume,
      }));
  })();

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverSearchAd"]} />

      {/* ── Section 1: Opportunity scatter ─────────────── */}
      {scatterData.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            기회 매트릭스 — 검색량 vs 포스트 수
          </h2>
          <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <OpportunityScatter data={scatterData} onPointClick={handleNewPost} />
          </div>
        </section>
      )}

      {/* ── Section 2: Cross-keyword analysis ──────────── */}
      {crossKeywords.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            교차 키워드 분석 — 2개 이상 카테고리에 걸친 키워드
          </h2>
          <div className="rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
            <DataTable
              columns={[
                { key: "keyword", label: "키워드", align: "left" },
                {
                  key: "categories",
                  label: "카테고리",
                  align: "left",
                  render: (row) => (
                    <div className="flex flex-wrap gap-1">
                      {(row.categories as string[]).map((c) => (
                        <CategoryBadge key={c} category={c} />
                      ))}
                    </div>
                  ),
                },
                { key: "categoryCount", label: "카테고리 수", align: "right" },
                {
                  key: "volume",
                  label: "월 검색량",
                  align: "right",
                  render: (row) => (
                    <span className="tabular-nums">
                      {(row.volume as number).toLocaleString("ko-KR")}
                    </span>
                  ),
                },
              ]}
              rows={crossKeywords as unknown as Record<string, unknown>[]}
              keyField="keyword"
              emptyMessage="교차 키워드가 없습니다"
            />
          </div>
        </section>
      )}

      {/* ── Section 3: Content gap table ──────────────── */}
      {overviewData.contentGap.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              콘텐츠 갭 분석 — 검색 수요 vs 콘텐츠 현황
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              갭 점수 = 검색량(70%) + 콘텐츠 부족도(25%)
              &nbsp;·&nbsp;
              <span className="text-red-600 font-medium">HIGH(≥70): 시급</span>
              &nbsp;·&nbsp;
              <span className="text-yellow-600 font-medium">MED(≥40): 권장</span>
              &nbsp;·&nbsp;
              <span className="text-green-600 font-medium">LOW(&lt;40)</span>
            </p>
          </div>
          {/* Desktop: DataTable (sm and above) */}
          <div className="hidden sm:block rounded-xl bg-[var(--surface)] shadow-sm overflow-hidden">
            <DataTable
              columns={[
                {
                  key: "subGroup",
                  label: "키워드 영역",
                  align: "left",
                  render: (row) => {
                    const direct = (row.directKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    const related = (row.relatedKeywords ?? []) as Array<{ keyword: string; volume: number }>;
                    const hasKeywords = direct.length > 0 || related.length > 0;
                    return (
                      <div>
                        <span className="font-medium text-[var(--foreground)]">{String(row.subGroup)}</span>
                        {hasKeywords && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {direct.map((dk) => (
                              <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${dk.volume.toLocaleString("ko-KR")}회`}>
                                {dk.keyword}
                                <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                              </span>
                            ))}
                            {related.map((rk) => (
                              <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700" title={`월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                                {rk.keyword}
                                <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
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
                        {totalVolume != null && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                            <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${barPct}%` }} />
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
                  render: (row) => <span className="tabular-nums text-[var(--foreground)]">{Number(row.existingPostCount)}</span>,
                },
                {
                  key: "gapScore",
                  label: "갭 점수",
                  align: "right",
                  sortable: true,
                  render: (row) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="tabular-nums text-[var(--foreground)]">{Number(row.gapScore).toFixed(0)}</span>
                      <GapScoreBadge score={Number(row.gapScore)} />
                    </div>
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

          {/* Mobile: Card list (below sm) */}
          <div className="block sm:hidden space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {([
                { key: "monthlyVolume", label: "검색량" },
                { key: "gapScore", label: "갭 점수" },
              ] as const).map((chip) => {
                const isActive = gapSortKey === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => handleGapSort(chip.key)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {chip.label}
                    {isActive && <span className="ml-0.5">{gapSortDir === "desc" ? "↓" : "↑"}</span>}
                  </button>
                );
              })}
            </div>
            {gapRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">콘텐츠 갭 데이터가 없습니다</p>
            ) : (
              gapRows.map((item) => {
                const mv = item.monthlyVolume;
                const relatedSum = (item.relatedKeywords ?? []).reduce((s, rk) => s + rk.volume, 0);
                const totalVolume = mv != null ? mv + relatedSum : null;
                const direct = item.directKeywords ?? [];
                const related = item.relatedKeywords ?? [];
                const hasKeywords = direct.length > 0 || related.length > 0;
                return (
                  <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0"><CategoryBadge category={item.category} /></span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{item.subGroup}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="text-xs tabular-nums text-[var(--foreground)]">
                          {totalVolume != null ? (
                            <>{item.isEstimated ? "≈" : ""}{totalVolume.toLocaleString("ko-KR")}<span className="text-[var(--muted)]">/월</span></>
                          ) : (
                            <span className="text-[var(--muted)]">{item.currentAvg.toFixed(1)}<span className="text-[9px]">(상대)</span></span>
                          )}
                        </span>
                        <GapScoreBadge score={item.gapScore} />
                      </span>
                    </div>
                    {hasKeywords && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {direct.map((dk) => (
                          <span key={dk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                            {dk.keyword}
                            <span className="ml-0.5 text-blue-400 tabular-nums">{dk.volume >= 1000 ? `${(dk.volume / 1000).toFixed(1)}k` : dk.volume}</span>
                          </span>
                        ))}
                        {related.map((rk) => (
                          <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                            {rk.keyword}
                            <span className="ml-0.5 text-blue-400 tabular-nums">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ── Section 4: Topic suggestions ──────────────── */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            추천 블로그 주제 — 검색량 + 콘텐츠 갭 기반
          </h2>
          <div className="space-y-3">
            {suggestions.slice(0, 15).map((item) => (
              <div key={`${item.rank}-${item.slug}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-xs font-bold text-[var(--muted)]">{item.rank}</span>
                  <PriorityBadge priority={item.priority} />
                  <CategoryBadge category={item.category} />
                  {(() => {
                    const gap = overviewData.contentGap.find(
                      (g) => g.slug === item.slug && g.keywords.some((k) => item.keywords.includes(k)),
                    );
                    if (!gap?.monthlyVolume) return null;
                    return (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 tabular-nums">
                        {gap.monthlyVolume.toLocaleString("ko-KR")}/월
                      </span>
                    );
                  })()}
                </div>
                <p className="mb-1.5 text-sm font-semibold text-[var(--foreground)] leading-snug">{item.suggestedTitle}</p>
                <p className="mb-2 text-xs text-[var(--muted)] leading-relaxed">{item.reasoning}</p>
                {item.keywords.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {item.keywords.slice(0, 5).map((kw) => (
                      <span key={kw} className="rounded bg-[var(--background)] px-2 py-0.5 text-xs text-[var(--muted)]">{kw}</span>
                    ))}
                    {(() => {
                      const gap = overviewData.contentGap.find(
                        (g) => g.slug === item.slug && g.keywords.some((k) => item.keywords.includes(k)),
                      );
                      const related = (gap?.relatedKeywords ?? []).filter(
                        (rk) => !item.keywords.includes(rk.keyword),
                      );
                      if (related.length === 0) return null;
                      return related.slice(0, 3).map((rk) => (
                        <span key={rk.keyword} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700" title={`연관 키워드 · 월 ${rk.volume.toLocaleString("ko-KR")}회`}>
                          {rk.keyword}
                          <span className="ml-0.5 text-blue-400 tabular-nums text-[10px]">{rk.volume >= 1000 ? `${(rk.volume / 1000).toFixed(1)}k` : rk.volume}</span>
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

      {/* ── Empty state ───────────────────────────────── */}
      {overviewData.contentGap.length === 0 && suggestions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            콘텐츠 갭 분석과 주제 추천 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
