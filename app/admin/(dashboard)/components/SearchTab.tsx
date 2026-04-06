"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FilePenLine, Search, Sparkles } from "lucide-react";
import type { BlogCategorySlug } from "@/lib/blog/types";
import { getCategoryLabel, isBlogCategorySlug } from "@/lib/blog/category-slugs";
import { useAdminApi } from "./useAdminApi";
import { MetricCard } from "./MetricCard";
import { PeriodSelector } from "./PeriodSelector";
import { DataTable } from "./DataTable";
import { AdminErrorState } from "./AdminErrorState";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { ApiSourceBadge } from "./insight/ApiSourceBadge";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminDisclosureSection } from "@/components/admin/AdminDisclosureSection";

// ---------------------------------------------------------------
// Recharts keyword chart — loaded client-side only
// ---------------------------------------------------------------

type KeywordChartItem = {
  query: string;
  impressions: number;
  clicks: number;
};

const KeywordBarChart = dynamic(
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

import type { MetricValue } from "./insight/shared";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface SearchMetricRow {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface RewriteReasonBadge {
  label: string;
  className: string;
}

interface QueryActionRecommendation {
  kind: "edit" | "new" | "review";
  label: string;
  description: string;
  slug?: string;
  category?: BlogCategorySlug | null;
  suggestedTitles?: string[];
}

interface SearchConsoleData {
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

type SearchPriorityRow =
  | SearchConsoleData["topPages"][number]
  | SearchConsoleData["topQueries"][number]
  | SearchConsoleData["blogPages"][number];

function hasQuery(row: SearchPriorityRow): row is SearchConsoleData["topQueries"][number] {
  return "query" in row;
}

type TableSortKey = keyof SearchMetricRow;
type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------
// Constants
// ---------------------------------------------------------------

const PERIODS = [
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

function useSearchTableSort<T extends SearchMetricRow>(
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

function getEditableBlogSlug(page: string) {
  const match = page.match(/^\/blog\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;

  const [, category, slug] = match;
  return isBlogCategorySlug(category) ? slug : null;
}

function getBlogCategoryFromPage(page: string): BlogCategorySlug | null {
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

function formatCtr(ctr: number, lowThreshold = 2) {
  const tone = ctr < lowThreshold ? "text-amber-600" : "text-[var(--foreground)]";
  return <span className={`font-medium tabular-nums ${tone}`}>{ctr}%</span>;
}

function getRewriteReasonBadges(row: SearchMetricRow): RewriteReasonBadge[] {
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

function buildSuggestedTitles(query: string, category?: BlogCategorySlug | null) {
  const currentYear = new Date().getFullYear();
  const categoryLabel = category ? getCategoryLabel(category) : null;
  const categoryPrefix = categoryLabel ? `${categoryLabel} ` : "";

  return [
    `${currentYear}년 ${query} 가이드: 꼭 알아야 할 핵심 정리`,
    `${categoryPrefix}${query} 치료 전 체크해야 할 5가지`,
    `${query}, 어떤 경우에 치과 상담이 필요할까?`,
  ];
}

function getMetaChecklist(page: string, row: SearchMetricRow) {
  const checklist = [
    "제목 앞부분에 핵심 검색어를 두고, 클릭 이유가 보이도록 구체화",
    "메타 설명에 지역/대상/증상/혜택 중 최소 1개를 명시",
  ];

  if (row.ctr < 1.5) {
    checklist.push("숫자·기간·대상 표현을 넣어 SERP 클릭 매력을 높이기");
  }

  if (page.startsWith("/blog/")) {
    checklist.push("도입부 첫 문단과 FAQ 질문이 검색 의도와 바로 맞닿는지 점검");
  } else if (page.startsWith("/treatments/")) {
    checklist.push("치료 대상, 과정, 비용/보험, 주의사항 중 빠진 항목을 title/description에 반영");
  } else {
    checklist.push("대표 질문 1개를 요약 문구에 넣어 페이지 목적을 더 선명하게 표시");
  }

  return checklist.slice(0, 3);
}

function getQueryActionRecommendation(
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
    description: "연결된 페이지를 더 확인한 뒤 기존 글 보강 또는 신규 글 작성 여부를 판단하세요.",
    suggestedTitles: buildSuggestedTitles(query, null),
  };
}

interface PageQueryDrilldownProps {
  page: string;
  queries: SearchConsoleData["pageTopQueries"][string];
  onClose: () => void;
  onEditBlog?: () => void;
  metrics?: SearchMetricRow;
}

function PageQueryDrilldown({
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
            이 페이지가 최근 검색에서 주로 노출된 검색어입니다.
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
          이 페이지에 연결된 대표 키워드 데이터가 아직 충분하지 않습니다.
        </div>
      )}
    </div>
  );
}

interface QueryPageDrilldownProps {
  query: string;
  pages: SearchConsoleData["queryTopPages"][string];
  onClose: () => void;
  onEditBlog: (slug: string) => void;
  onCreatePost: (category?: string | null) => void;
}

function QueryPageDrilldown({
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
            현재 검색어로 주로 노출되는 대표 페이지입니다. 블로그 글이면 바로 수정할 수 있습니다.
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
          이 키워드에 연결된 대표 페이지 데이터가 아직 충분하지 않습니다.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// Main component
// ---------------------------------------------------------------

export function SearchTab() {
  const router = useRouter();
  const [period, setPeriod] = useState<"7d" | "28d" | "90d">("28d");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [selectedTopPage, setSelectedTopPage] = useState<string | null>(null);
  const [selectedBlogPage, setSelectedBlogPage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminApi<SearchConsoleData>(
    `/api/admin/search-console?period=${period}`,
  );

  const querySort = useSearchTableSort(data?.topQueries ?? []);
  const pageSort = useSearchTableSort(data?.topPages ?? []);
  const blogSort = useSearchTableSort(data?.blogPages ?? []);

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "7d" | "28d" | "90d");
    setSelectedQuery(null);
    setSelectedTopPage(null);
    setSelectedBlogPage(null);
  };

  const handleEditBlog = (slug: string) => {
    router.push(`/admin/content/posts/${encodeURIComponent(slug)}`);
  };

  const handleCreateRelatedPost = (category?: string | null) => {
    if (category && isBlogCategorySlug(category)) {
      router.push(`/admin/content/posts/new?category=${encodeURIComponent(category)}`);
      return;
    }
    router.push("/admin/content/posts/new");
  };

  const metaImprovementPages = useMemo(() => {
    return (data?.topPages ?? [])
      .filter((row) => row.impressions >= 80 && row.ctr < 2.5)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data?.topPages]);

  const rankingOpportunityQueries = useMemo(() => {
    return (data?.topQueries ?? [])
      .filter((row) => row.impressions >= 50 && row.position >= 4 && row.position <= 15)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data?.topQueries]);

  const rewriteCandidates = useMemo(() => {
    return (data?.blogPages ?? [])
      .filter((row) => row.impressions >= 60 && (row.ctr < 2.5 || row.position > 8))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3);
  }, [data?.blogPages]);

  const hasPriorityItems =
    metaImprovementPages.length > 0 ||
    rankingOpportunityQueries.length > 0 ||
    rewriteCandidates.length > 0;

  const selectedQueryPages = selectedQuery
    ? data?.queryTopPages[selectedQuery] ?? []
    : [];
  const selectedTopPageQueries = selectedTopPage
    ? data?.pageTopQueries[selectedTopPage] ?? []
    : [];
  const selectedBlogPageQueries = selectedBlogPage
    ? data?.pageTopQueries[selectedBlogPage] ?? []
    : [];
  const selectedTopPageMetrics = selectedTopPage
    ? data?.topPages.find((item) => item.page === selectedTopPage)
    : undefined;
  const selectedBlogPageMetrics = selectedBlogPage
    ? data?.blogPages.find((item) => item.page === selectedBlogPage)
    : undefined;
  const topOpportunity: SearchPriorityRow | null =
    rewriteCandidates[0] ?? rankingOpportunityQueries[0] ?? metaImprovementPages[0] ?? null;

  return (
    <div className="space-y-6">
      <ApiSourceBadge sources={["searchConsole"]} />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector periods={PERIODS} selected={period} onChange={handlePeriodChange} />
        {data?.siteUrl && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            🔎 속성: {data.siteUrl}
            {data.configuredSiteUrl !== data.siteUrl ? " (자동 전환)" : ""}
          </span>
        )}
        {data?.dataAsOf && (
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
            ⓘ 데이터 기준: {data.dataAsOf} (2~3일 지연)
          </span>
        )}
      </div>

      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {loading && <AdminLoadingSkeleton variant="metrics" />}

      {!loading && !error && data && (
        <>
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminPill tone="white">검색 성과 요약</AdminPill>
                  <AdminPill tone={hasPriorityItems ? "warning" : "white"}>
                    {hasPriorityItems ? "즉시 확인 필요" : "급한 항목 적음"}
                  </AdminPill>
                </div>
                <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">먼저 볼 것만 위로 올렸습니다.</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  검색량이 충분한데 클릭이 약한 항목, 순위를 더 올릴 여지가 있는 키워드, 반응이 약한 블로그를 우선 보여줍니다.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-medium text-amber-700">메타 개선 후보</div>
                  <div className="mt-1 text-lg font-semibold text-amber-900">{metaImprovementPages.length}건</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="text-xs font-medium text-blue-700">순위 상승 여지</div>
                  <div className="mt-1 text-lg font-semibold text-blue-900">{rankingOpportunityQueries.length}건</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-medium text-emerald-700">리라이트 후보</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-900">{rewriteCandidates.length}건</div>
                </div>
              </div>
            </div>

            {topOpportunity && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-semibold text-[var(--foreground)]">가장 먼저 볼 후보</span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {hasQuery(topOpportunity) ? topOpportunity.query : topOpportunity.page}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  노출 {topOpportunity.impressions.toLocaleString("ko-KR")} · 클릭 {topOpportunity.clicks.toLocaleString("ko-KR")} · CTR {topOpportunity.ctr}% · 순위 {topOpportunity.position}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {"page" in topOpportunity && getEditableBlogSlug(topOpportunity.page) && (
                    <AdminActionButton
                      tone="dark"
                      onClick={() => handleEditBlog(getEditableBlogSlug(topOpportunity.page)!)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      <FilePenLine className="h-3.5 w-3.5" />
                      이 글 수정
                    </AdminActionButton>
                  )}
                  {hasQuery(topOpportunity) && (
                    <AdminActionButton
                      tone="dark"
                      onClick={() => setSelectedQuery(topOpportunity.query)}
                      className="min-h-8 px-3 py-1 text-xs"
                    >
                      <Search className="h-3.5 w-3.5" />
                      연결 페이지 보기
                    </AdminActionButton>
                  )}
                </div>
              </div>
            )}
          </AdminSurface>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="총 노출"
              value={data.summary.impressions.value.toLocaleString("ko-KR")}
              change={data.summary.impressions.change}
            />
            <MetricCard
              label="총 클릭"
              value={data.summary.clicks.value.toLocaleString("ko-KR")}
              change={data.summary.clicks.change}
            />
            <MetricCard
              label="평균 CTR"
              value={`${data.summary.ctr.value}%`}
              change={data.summary.ctr.change}
            />
            <MetricCard
              label="평균 순위"
              value={data.summary.position.value}
              change={data.summary.position.change}
              invertChange={true}
            />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  지금 우선 조치할 항목
                </h3>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  높은 노출 대비 클릭이 약한 페이지와, 조금만 보강하면 순위를 더 올릴 수 있는 항목을 추렸습니다.
                </p>
              </div>
              <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
                자동 진단
              </span>
            </div>

            {hasPriorityItems ? (
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">메타 개선 후보</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">블로그를 제외한 주요 페이지 중 노출은 높은데 CTR이 낮아 제목/설명 보완 효과가 큰 페이지</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      {metaImprovementPages.length}건
                    </span>
                  </div>
                  {metaImprovementPages.length > 0 ? (
                    <ul className="space-y-3">
                      {metaImprovementPages.map((row) => (
                        <li key={row.page} className="rounded-xl bg-white/80 p-3">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]" title={row.page}>{row.page}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            노출 {row.impressions.toLocaleString("ko-KR")} · 클릭 {row.clicks.toLocaleString("ko-KR")} · CTR {row.ctr}%
                          </p>
                          <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                            {getMetaChecklist(row.page, row).map((item) => (
                              <li key={`${row.page}-${item}`}>• {item}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">현재 기준으로 강한 메타 개선 후보는 없습니다.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">순위 상승 여지 키워드</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">4~15위권에서 본문 보강·FAQ·내부링크로 끌어올리기 좋은 검색어</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {rankingOpportunityQueries.length}건
                    </span>
                  </div>
                  {rankingOpportunityQueries.length > 0 ? (
                    <ul className="space-y-3">
                      {rankingOpportunityQueries.map((row) => {
                        const recommendation = getQueryActionRecommendation(
                          row.query,
                          data.queryTopPages[row.query],
                        );
                        return (
                        <li key={row.query} className="rounded-xl bg-white/80 p-3">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]" title={row.query}>{row.query}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            순위 {row.position} · 노출 {row.impressions.toLocaleString("ko-KR")} · CTR {row.ctr}%
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
                              <span className="text-[11px] text-[var(--muted)]">
                                {recommendation.description}
                              </span>
                            </div>
                            {recommendation.kind === "new" && recommendation.suggestedTitles && (
                              <ul className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
                                {recommendation.suggestedTitles.slice(0, 2).map((title) => (
                                  <li key={`${row.query}-${title}`}>• {title}</li>
                                ))}
                              </ul>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {recommendation.kind === "edit" && recommendation.slug && (
                                <button
                                  type="button"
                                  onClick={() => handleEditBlog(recommendation.slug!)}
                                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                >
                                  기존 글 수정
                                </button>
                              )}
                              {recommendation.kind === "new" && (
                                <button
                                  type="button"
                                  onClick={() => handleCreateRelatedPost(recommendation.category)}
                                  className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                                >
                                  관련 글 작성
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">현재 기간에는 빠르게 끌어올릴 키워드가 두드러지지 않습니다.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--border)]/80">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">블로그 리라이트 후보</h4>
                      <p className="mt-1 text-xs text-[var(--muted)]">노출 대비 반응이 약한 글. 제목/도입부/FAQ/내부링크 보강 우선순위입니다.</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {rewriteCandidates.length}건
                    </span>
                  </div>
                  {rewriteCandidates.length > 0 ? (
                    <ul className="space-y-3">
                      {rewriteCandidates.map((row) => {
                        const slug = getEditableBlogSlug(row.page);
                        const rewriteReasons = getRewriteReasonBadges(row);
                        return (
                          <li key={row.page} className="rounded-xl bg-white/80 p-3">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]" title={row.page}>{row.page}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              노출 {row.impressions.toLocaleString("ko-KR")} · CTR {row.ctr}% · 순위 {row.position}
                            </p>
                            {rewriteReasons.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {rewriteReasons.map((reason) => (
                                  <span
                                    key={`${row.page}-${reason.label}`}
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${reason.className}`}
                                  >
                                    {reason.label}
                                  </span>
                                ))}
                              </div>
                            )}
                            {slug && (
                              <button
                                type="button"
                                onClick={() => handleEditBlog(slug)}
                                className="mt-2 inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                              >
                                이 글 수정하기
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-white/80 p-3 text-xs text-[var(--muted)]">현재 기간에는 리라이트 우선 글이 뚜렷하지 않습니다.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)] shadow-sm ring-1 ring-[var(--border)]/80">
                현재 데이터 기준으로 급한 개선 후보는 많지 않습니다. 아래 표에서 CTR/순위 정렬로 세부 항목을 확인해보세요.
              </div>
            )}
          </section>

          <AdminDisclosureSection
            title="상위 검색 키워드"
            description="키워드를 더 많이 불러오고, 선택한 키워드의 연결 페이지를 바로 확인할 수 있습니다."
            countLabel={`${data.topQueries.length}개`}
            collapsedMessage="필요할 때만 키워드 표와 드릴다운을 펼쳐 볼 수 있습니다."
          >
            {data.topQueries.length > 0 && (
              <div className="mb-4 rounded-xl bg-[var(--surface)] p-4 shadow-sm">
                <KeywordBarChart data={data.topQueries} />
              </div>
            )}
            <DataTable
              columns={[
                {
                  key: "query",
                  label: "키워드",
                  align: "left",
                  render: (row) => {
                    const query = String((row as { query: string }).query);
                    const isSelected = selectedQuery === query;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedQuery((current) =>
                            current === query ? null : query,
                          )
                        }
                        className={`block max-w-[220px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={query}
                      >
                        {query}
                      </button>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right", sortable: true },
                { key: "clicks", label: "클릭", align: "right", sortable: true },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  sortable: true,
                  render: (row) => formatCtr((row as SearchConsoleData["topQueries"][number]).ctr),
                },
                { key: "position", label: "순위", align: "right", sortable: true },
              ]}
              rows={querySort.sortedRows as unknown as Record<string, unknown>[]}
              keyField="query"
              emptyMessage="검색 키워드 데이터가 없습니다"
              sortKey={querySort.sortKey}
              sortDirection={querySort.sortDirection}
              onSort={querySort.handleSort}
              scrollClassName="max-h-[36rem] overflow-y-auto"
              stickyHeader={true}
            />
            {selectedQuery && (
              <QueryPageDrilldown
                query={selectedQuery}
                pages={selectedQueryPages}
                onClose={() => setSelectedQuery(null)}
                onEditBlog={handleEditBlog}
                onCreatePost={handleCreateRelatedPost}
              />
            )}
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="상위 페이지별 검색 성과"
            description="블로그를 제외한 주요 페이지 성과를 비교하고, 대표 유입 키워드를 바로 확인할 수 있습니다."
            countLabel={`${data.topPages.length}개`}
            collapsedMessage="필요할 때만 주요 페이지 표와 대표 키워드 드릴다운을 펼쳐 볼 수 있습니다."
          >
            <DataTable
              columns={[
                {
                  key: "page",
                  label: "페이지",
                  align: "left",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    const isSelected = selectedTopPage === page;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTopPage((current) =>
                            current === page ? null : page,
                          )
                        }
                        className={`block max-w-[200px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={page}
                      >
                        {page}
                      </button>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right", sortable: true },
                { key: "clicks", label: "클릭", align: "right", sortable: true },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  sortable: true,
                  render: (row) => formatCtr((row as SearchConsoleData["topPages"][number]).ctr),
                },
                { key: "position", label: "순위", align: "right", sortable: true },
              ]}
              rows={pageSort.sortedRows as unknown as Record<string, unknown>[]}
              keyField="page"
              emptyMessage="페이지 데이터가 없습니다"
              sortKey={pageSort.sortKey}
              sortDirection={pageSort.sortDirection}
              onSort={pageSort.handleSort}
            />
            {selectedTopPage && (
              <PageQueryDrilldown
                page={selectedTopPage}
                queries={selectedTopPageQueries}
                onClose={() => setSelectedTopPage(null)}
                metrics={selectedTopPageMetrics}
              />
            )}
          </AdminDisclosureSection>

          <AdminDisclosureSection
            title="블로그 포스트 검색 성과"
            description="페이지명을 클릭하면 유입 키워드를 보고, 수정 버튼으로 바로 편집할 수 있습니다."
            countLabel={`${data.blogPages.length}개`}
            defaultOpen={true}
            collapsedMessage="필요할 때만 블로그 성과 표와 수정 액션을 펼쳐 볼 수 있습니다."
          >
            <DataTable
              columns={[
                {
                  key: "page",
                  label: "페이지",
                  align: "left",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    const isSelected = selectedBlogPage === page;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBlogPage((current) =>
                            current === page ? null : page,
                          )
                        }
                        className={`block max-w-[200px] truncate text-left sm:max-w-xs ${
                          isSelected
                            ? "font-medium text-[var(--color-primary)]"
                            : "text-[var(--foreground)] hover:text-[var(--color-primary)]"
                        }`}
                        title={page}
                      >
                        {page}
                      </button>
                    );
                  },
                },
                { key: "impressions", label: "노출", align: "right", sortable: true },
                { key: "clicks", label: "클릭", align: "right", sortable: true },
                {
                  key: "ctr",
                  label: "CTR (%)",
                  align: "right",
                  sortable: true,
                  render: (row) => formatCtr((row as SearchConsoleData["blogPages"][number]).ctr),
                },
                { key: "position", label: "순위", align: "right", sortable: true },
                {
                  key: "actions",
                  label: "실행",
                  align: "center",
                  render: (row) => {
                    const page = String((row as { page: string }).page);
                    const slug = getEditableBlogSlug(page);
                    if (!slug) {
                      return <span className="text-xs text-[var(--muted)]">상세 글 아님</span>;
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => handleEditBlog(slug)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      >
                        수정하기
                      </button>
                    );
                  },
                },
              ]}
              rows={blogSort.sortedRows as unknown as Record<string, unknown>[]}
              keyField="page"
              emptyMessage="블로그 검색 데이터가 없습니다"
              sortKey={blogSort.sortKey}
              sortDirection={blogSort.sortDirection}
              onSort={blogSort.handleSort}
            />
            {selectedBlogPage && (
              <PageQueryDrilldown
                page={selectedBlogPage}
                queries={selectedBlogPageQueries}
                onClose={() => setSelectedBlogPage(null)}
                metrics={selectedBlogPageMetrics}
                onEditBlog={
                  getEditableBlogSlug(selectedBlogPage)
                    ? () => handleEditBlog(getEditableBlogSlug(selectedBlogPage)!)
                    : undefined
                }
              />
            )}
          </AdminDisclosureSection>
        </>
      )}
    </div>
  );
}
