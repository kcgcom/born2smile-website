"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import type { KeywordCategorySlug, SearchIntent } from "@/lib/admin-naver-datalab-keywords";
import type { ContentGapItem, InsightActionItem } from "./shared";

export const CATEGORY_SCATTER_COLORS: Record<KeywordCategorySlug, string> = {
  implant: "#2563EB",
  orthodontics: "#C9962B",
  prosthetics: "#16A34A",
  restorative: "#9333EA",
  prevention: "#0891B2",
  pediatric: "#DC2626",
  "health-tips": "#EA580C",
  "dental-choice": "#D946EF",
};

export interface ScatterPoint {
  subGroup: string;
  category: KeywordCategorySlug;
  slug: KeywordCategorySlug;
  x: number;
  y: number;
  z: number;
  searchIntent?: SearchIntent;
}

export const OpportunityScatter = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data, onPointClick }: { data: ScatterPoint[]; onPointClick?: (slug: KeywordCategorySlug) => void }) {
        if (data.length === 0) {
          return (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              검색량 데이터가 있는 항목이 없습니다
            </p>
          );
        }

        const categories = [...new Set(data.map((d) => d.category))] as KeywordCategorySlug[];

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
                  name="콘텐츠 공백"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  label={{ value: "콘텐츠 공백", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#6B7280" }}
                />
                <mod.ZAxis type="number" dataKey="z" range={[60, 400]} />
                <mod.Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0].payload as ScatterPoint;
                    const intentStyles: Record<SearchIntent, { label: string; className: string }> = {
                      informational: { label: "정보형", className: "bg-blue-100 text-blue-700" },
                      commercial:    { label: "비교/검토", className: "bg-orange-100 text-orange-700" },
                      transactional: { label: "전환형", className: "bg-green-100 text-green-700" },
                      navigational:  { label: "탐색형", className: "bg-[var(--background)] text-[var(--muted)]" },
                    };
                    const intentStyle = d.searchIntent ? intentStyles[d.searchIntent] : null;
                    return (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 shadow text-xs">
                        <p className="font-semibold">{d.subGroup}</p>
                        <p className="text-[var(--muted)]">{d.category}</p>
                        {intentStyle && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${intentStyle.className}`}>
                            {intentStyle.label}
                          </span>
                        )}
                        <p>검색량: {d.x.toLocaleString("ko-KR")}/월</p>
                        <p>콘텐츠 공백: {d.y.toFixed(0)}</p>
                        <p>신규 글 가치: {d.z.toFixed(0)}</p>
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
                    onClick={onPointClick ? (point: any) => {
                      if (point?.slug) onPointClick(point.slug);
                    } : undefined}
                    cursor={onPointClick ? "pointer" : "default"}
                  />
                ))}
                <mod.Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </mod.ScatterChart>
            </mod.ResponsiveContainer>
            <p className="mt-2 text-center text-xs text-[var(--muted)]">
              우측 상단은 검색 수요와 콘텐츠 공백이 모두 큰 영역입니다. 점 크기는 신규 글 가치를 나타냅니다.
            </p>
          </div>
        );
      }
      return Chart;
    }),
  { ssr: false },
);

// ---------------------------------------------------------------
// Sort state management for content gap table
// ---------------------------------------------------------------

export type GapSortKey = "contentGapScore" | "existingPostCount" | "currentAvg" | "monthlyVolume";

export function useGapTableSort(initial: GapSortKey = "contentGapScore") {
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
        const av =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (a.monthlyVolume ?? a.currentAvg)
            : (a[sortKey] as number);
        const bv =
          sortKey === "currentAvg" || sortKey === "monthlyVolume"
            ? (b.monthlyVolume ?? b.currentAvg)
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

export const INTENT_FILTER_OPTIONS: Array<{ value: SearchIntent | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "informational", label: "정보형" },
  { value: "commercial", label: "비교/검토" },
  { value: "transactional", label: "전환형" },
  { value: "navigational", label: "탐색형" },
];

export const ACTION_LABELS: Record<InsightActionItem["actionType"], string> = {
  blog: "새 글 작성",
  page: "서비스 페이지 보강",
  faq: "FAQ 확장",
};

export function buildCrossKeywords(contentGap: ContentGapItem[]) {
  const kwCatMap = new Map<string, { categories: Set<string>; volume: number }>();
  for (const gap of contentGap) {
    for (const kw of [...(gap.directKeywords ?? []), ...(gap.relatedKeywords ?? [])]) {
      const entry = kwCatMap.get(kw.keyword) ?? { categories: new Set(), volume: 0 };
      entry.categories.add(gap.category);
      entry.volume = Math.max(entry.volume, kw.volume);
      kwCatMap.set(kw.keyword, entry);
    }
  }

  return [...kwCatMap.entries()]
    .filter(([, value]) => value.categories.size >= 2)
    .sort((a, b) => b[1].categories.size - a[1].categories.size || b[1].volume - a[1].volume)
    .slice(0, 20)
    .map(([keyword, value]) => ({
      keyword,
      categories: [...value.categories],
      categoryCount: value.categories.size,
      volume: value.volume,
    }));
}
