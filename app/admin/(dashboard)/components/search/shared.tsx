"use client";

import { type ReactNode, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { BlogCategorySlug } from "@/lib/blog/types";
import { getCategoryLabel, isBlogCategorySlug } from "@/lib/blog/category-slugs";
import type { MetricValue } from "../insight/shared";

export type KeywordChartItem = {
  query: string;
  impressions: number;
  clicks: number;
};

export const KeywordBarChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      function Chart({ data }: { data: KeywordChartItem[] }) {
        const truncate = (s: string, n = 10) =>
          s.length > n ? s.slice(0, n) + "…" : s;
        const chartData = data.slice(0, 10).map((d) => ({
          ...d,
          label: truncate(d.query),
        }));
        const tooltipFormatter = (
          value: number | string | undefined,
          name: string | undefined,
        ) => [
          Number(value ?? 0).toLocaleString("ko-KR"),
          name === "impressions" ? "노출" : "클릭",
        ] as [string, string];
        const tooltipLabelFormatter = (label: ReactNode) => {
          const labelText =
            typeof label === "string" || typeof label === "number"
              ? String(label)
              : "";
          const item = chartData.find((d) => d.label === labelText);
          return item?.query ?? labelText;
        };
        return (
          <mod.ResponsiveContainer width="100%" height={300}>
            <mod.BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 52 }}
            >
              <mod.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <mod.XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <mod.YAxis tick={{ fontSize: 11, fill: "#6B7280" }} width={44} />
              <mod.Tooltip
                formatter={tooltipFormatter}
                labelFormatter={tooltipLabelFormatter}
                contentStyle={{ fontSize: 12 }}
              />
              <mod.Legend
                formatter={(value) =>
                  value === "impressions" ? "노출" : "클릭"
                }
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <mod.Bar
                dataKey="impressions"
                name="impressions"
                fill="#2563EB"
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
              <mod.Bar
                dataKey="clicks"
                name="clicks"
                fill="#C9962B"
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
            </mod.BarChart>
          </mod.ResponsiveContainer>
        );
      }
      return Chart;
    }),
  { ssr: false },
);


// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface SearchMetricRow {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface RewriteReasonBadge {
  label: string;
  className: string;
}

export interface QueryActionRecommendation {
  kind: "edit" | "new" | "review";
  label: string;
  description: string;
  slug?: string;
  category?: BlogCategorySlug | null;
  suggestedTitles?: string[];
}

export interface SearchConsoleData {
  siteUrl: string;
  configuredSiteUrl: string;
  dataAsOf: string;
  period: { start: string; end: string };
  comparePeriod: { start: string; end: string };
  summary: {
    impressions: MetricValue;
    clicks: MetricValue;
    ctr: MetricValue;
    position: MetricValue;
  };
  topQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  blogPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  pageTopQueries: Record<
    string,
    Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>
  >;
  queryTopPages: Record<
    string,
    Array<{
      page: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>
  >;
}

export type SearchPriorityRow =
  | SearchConsoleData["topPages"][number]
  | SearchConsoleData["topQueries"][number]
  | SearchConsoleData["blogPages"][number];

export function hasQuery(row: SearchPriorityRow): row is SearchConsoleData["topQueries"][number] {
  return "query" in row;
}

export type TableSortKey = keyof SearchMetricRow;
export type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

export const PERIODS = [
  { value: "7d", label: "7일" },
  { value: "28d", label: "28일" },
  { value: "90d", label: "3개월" },
];

const DEFAULT_SORT_DIRECTION: Record<TableSortKey, SortDirection> = {
  impressions: "desc",
  clicks: "desc",
  ctr: "desc",
  position: "asc",
};

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

export function useSearchTableSort<T extends SearchMetricRow>(
  rows: T[],
  initialKey: TableSortKey = "impressions",
) {
  const [sortKey, setSortKey] = useState<TableSortKey>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    DEFAULT_SORT_DIRECTION[initialKey],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const direction = sortDirection === "asc" ? 1 : -1;

      if (aValue === bValue) return b.impressions - a.impressions;
      return (aValue < bValue ? -1 : 1) * direction;
    });
  }, [rows, sortDirection, sortKey]);

  const handleSort = (key: string) => {
    const nextKey = key as TableSortKey;
    if (!(nextKey in DEFAULT_SORT_DIRECTION)) return;

    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(DEFAULT_SORT_DIRECTION[nextKey]);
  };

  return { sortedRows, sortKey, sortDirection, handleSort };
}

export function getEditableBlogSlug(page: string) {
  const match = page.match(/^\/blog\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, category, slug] = match;
  return isBlogCategorySlug(category) ? slug : null;
}

export function getBlogCategoryFromPage(page: string): BlogCategorySlug | null {
  const blogMatch = page.match(/^\/blog\/([^/]+)(?:\/[^/]+)?\/?$/);
  if (blogMatch && isBlogCategorySlug(blogMatch[1])) {
    return blogMatch[1];
  }

  const treatmentMatch = page.match(/^\/treatments\/([^/]+)\/?$/);
  if (!treatmentMatch) return null;

  const treatmentToCategory: Record<string, string> = {
    implant: "implant",
    orthodontics: "orthodontics",
    prosthetics: "prosthetics",
    restorative: "restorative",
    pediatric: "pediatric",
    prevention: "prevention",
    scaling: "prevention",
  };

  const category = treatmentToCategory[treatmentMatch[1]];
  return category && isBlogCategorySlug(category) ? category : null;
}

export function formatCtr(ctr: number, lowThreshold = 2) {
  const tone = ctr < lowThreshold ? "text-amber-600" : "text-[var(--foreground)]";
  return <span className={`font-medium tabular-nums ${tone}`}>{ctr}%</span>;
}

export function getRewriteReasonBadges(row: SearchMetricRow): RewriteReasonBadge[] {
  const badges: RewriteReasonBadge[] = [];

  if (row.ctr < 1.5) {
    badges.push({
      label: "CTR 매우 낮음",
      className: "bg-rose-50 text-rose-700 ring-rose-100",
    });
  } else if (row.ctr < 2.5) {
    badges.push({
      label: "CTR 개선 필요",
      className: "bg-amber-50 text-amber-700 ring-amber-100",
    });
  }

  if (row.position > 12) {
    badges.push({
      label: "순위 낮음",
      className: "bg-violet-50 text-violet-700 ring-violet-100",
    });
  } else if (row.position > 8) {
    badges.push({
      label: "본문 보강 후보",
      className: "bg-blue-50 text-blue-700 ring-blue-100",
    });
  }

  if (row.impressions >= 150 && row.clicks < 8) {
    badges.push({
      label: "노출 대비 클릭 약함",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    });
  }

  return badges;
}

export function buildSuggestedTitles(query: string, category?: BlogCategorySlug | null) {
  const currentYear = new Date().getFullYear();
  const categoryLabel = category ? getCategoryLabel(category) : null;
  const categoryPrefix = categoryLabel ? `${categoryLabel} ` : "";

  return [
    `${currentYear}년 ${query} 가이드: 꼭 알아야 할 핵심 정리`,
    `${categoryPrefix}${query} 치료 전 체크해야 할 5가지`,
    `${query}, 어떤 경우에 치과 상담이 필요할까?`,
  ];
}

export function getMetaChecklist(page: string, row: SearchMetricRow) {
  const checklist = [
    "제목 앞에 핵심 검색어 배치",
    "메타 설명에 핵심 정보 1개 이상 포함",
  ];

  if (row.ctr < 1.5) {
    checklist.push("숫자·기간 표현 추가");
  }

  if (page.startsWith("/blog/")) {
    checklist.push("도입부/FAQ가 검색 의도와 맞는지 점검");
  } else if (page.startsWith("/treatments/")) {
    checklist.push("title/description 핵심 항목 보완");
  } else {
    checklist.push("대표 질문 1개를 요약 문구에 반영");
  }

  return checklist.slice(0, 3);
}

export function getQueryActionRecommendation(
  query: string,
  pages: SearchConsoleData["queryTopPages"][string] | undefined,
): QueryActionRecommendation {
  const relatedPages = pages ?? [];

  const editablePage = relatedPages.find((item) => getEditableBlogSlug(item.page));
  if (editablePage) {
    return {
      kind: "edit",
      label: "기존 글 수정 추천",
      description: `${editablePage.page} 글이 이미 이 키워드를 받고 있어 빠른 성과 개선이 가능합니다.`,
      slug: getEditableBlogSlug(editablePage.page) ?? undefined,
    };
  }

  const category = relatedPages
    .map((item) => getBlogCategoryFromPage(item.page))
    .find((value): value is BlogCategorySlug => value !== null);
  if (category) {
    const categoryLabel = getCategoryLabel(category);
    return {
      kind: "new",
      label: "관련 글 작성 추천",
      description: `${categoryLabel} 카테고리에서 별도 글로 검색 의도를 분리해 공략하는 편이 좋습니다.`,
      category,
      suggestedTitles: buildSuggestedTitles(query, category),
    };
  }

  return {
    kind: "review",
    label: "수동 검토 필요",
    description: "연결 페이지를 보고 수정 또는 새 글 여부를 정하세요.",
    suggestedTitles: buildSuggestedTitles(query, null),
  };
}

export interface PageQueryDrilldownProps {
  page: string;
  queries: SearchConsoleData["pageTopQueries"][string];
  onClose: () => void;
  onEditBlog?: () => void;
  metrics?: SearchMetricRow;
}

export function PageQueryDrilldown({
  page,
  queries,
  onClose,
  onEditBlog,
  metrics,
}: PageQueryDrilldownProps) {
  return (
    <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted)]">대표 유입 키워드</p>
          <h4 className="mt-1 text-sm font-semibold text-[var(--foreground)]">{page}</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            이 페이지의 주요 유입 키워드입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEditBlog && (
            <button
              type="button"
              onClick={onEditBlog}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              이 글 수정하기
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            닫기
          </button>
        </div>
      </div>

      {metrics && metrics.ctr < 2.5 && (
        <div className="mt-4 rounded-xl bg-white/80 px-3 py-3">
          <p className="text-xs font-medium text-[var(--muted)]">메타 개선 체크리스트</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--foreground)]">
            {getMetaChecklist(page, metrics).map((item) => (
              <li key={`${page}-meta-${item}`}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {queries.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {queries.map((item) => (
            <li
              key={`${page}-${item.query}`}
              className="rounded-xl bg-white/80 px-3 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium text-[var(--foreground)]"
                    title={item.query}
                  >
                    {item.query}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    노출 {item.impressions.toLocaleString("ko-KR")} · 클릭{" "}
                    {item.clicks.toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-[var(--muted)]">
                  <span>CTR {item.ctr}%</span>
                  <span>순위 {item.position}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl bg-white/80 px-3 py-4 text-sm text-[var(--muted)]">
          대표 키워드 데이터가 아직 적습니다.
        </div>
      )}
    </div>
  );
}

export interface QueryPageDrilldownProps {
  query: string;
  pages: SearchConsoleData["queryTopPages"][string];
  onClose: () => void;
  onEditBlog: (slug: string) => void;
  onCreatePost: (category?: string | null) => void;
}

export function QueryPageDrilldown({
  query,
  pages,
  onClose,
  onEditBlog,
  onCreatePost,
}: QueryPageDrilldownProps) {
  const recommendation = getQueryActionRecommendation(query, pages);

  return (
    <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted)]">이 키워드가 연결된 페이지</p>
          <h4 className="mt-1 text-sm font-semibold text-[var(--foreground)]">{query}</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            이 키워드에 연결된 대표 페이지입니다.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${
                recommendation.kind === "edit"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : recommendation.kind === "new"
                    ? "bg-blue-50 text-blue-700 ring-blue-100"
                    : "bg-slate-100 text-slate-700 ring-slate-200"
              }`}
            >
              {recommendation.label}
            </span>
            <span className="text-xs text-[var(--muted)]">{recommendation.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recommendation.kind === "edit" && recommendation.slug && (
            <button
              type="button"
              onClick={() => onEditBlog(recommendation.slug!)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              기존 글 수정
            </button>
          )}
          {recommendation.kind === "new" && (
            <button
              type="button"
              onClick={() => onCreatePost(recommendation.category)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              관련 글 작성
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            닫기
          </button>
        </div>
      </div>

      {recommendation.kind === "new" && recommendation.suggestedTitles && (
        <div className="mt-4 rounded-xl bg-white/80 px-3 py-3">
          <p className="text-xs font-medium text-[var(--muted)]">추천 제목 초안</p>
          <ul className="mt-2 space-y-1.5">
            {recommendation.suggestedTitles.map((title) => (
              <li key={`${query}-${title}`} className="text-sm text-[var(--foreground)]">
                • {title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {pages.map((item) => {
            const blogSlug = getEditableBlogSlug(item.page);
            return (
              <li
                key={`${query}-${item.page}`}
                className="rounded-xl bg-white/80 px-3 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-[var(--foreground)]"
                      title={item.page}
                    >
                      {item.page}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      노출 {item.impressions.toLocaleString("ko-KR")} · 클릭{" "}
                      {item.clicks.toLocaleString("ko-KR")} · CTR {item.ctr}% · 순위{" "}
                      {item.position}
                    </p>
                  </div>
                  {blogSlug ? (
                    <button
                      type="button"
                      onClick={() => onEditBlog(blogSlug)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      이 글 수정하기
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">페이지 분석</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl bg-white/80 px-3 py-4 text-sm text-[var(--muted)]">
          연결된 페이지 데이터가 아직 적습니다.
        </div>
      )}
    </div>
  );
}
