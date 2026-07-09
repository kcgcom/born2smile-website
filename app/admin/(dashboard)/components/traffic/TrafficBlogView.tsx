"use client";

import { useMemo, useState } from "react";
import { MetricCard } from "../MetricCard";
import { DataTable } from "../DataTable";
import { formatDuration } from "../insight/shared";
import { SectionCard } from "./SectionCard";
import { getBlogSlugFromPath } from "./types";
import type { Period, BlogGA4Data, ConversionData, TopPageDetail } from "./types";

interface TrafficBlogViewProps {
  period: Period;
  blogGa4Data: BlogGA4Data | null | undefined;
  blogGa4Loading: boolean;
  blogGa4Error: string | null | undefined;
  conversionData: ConversionData | null | undefined;
  conversionLoading: boolean;
  blogAggregateDetail: TopPageDetail | null;
  blogTitleMap: Map<string, string>;
  blogSummary: { pageViews: number; avgDuration: number; trackedPosts: number };
  activeBlogPosts: number;
  longestReadPosts: Array<{ path: string; pageViews: number; avgDuration: number }>;
  shortestReadPosts: Array<{ path: string; pageViews: number; avgDuration: number }>;
  blogSourceShare: Array<{ source: string; sessions: number; percentage: number }>;
  topPageDetails: Record<string, TopPageDetail>;
  onSelectTopPage: (path: string) => void;
}

export function TrafficBlogView({
  period,
  blogGa4Data,
  blogGa4Loading,
  blogGa4Error,
  conversionData,
  conversionLoading,
  blogAggregateDetail,
  blogTitleMap,
  blogSummary,
  activeBlogPosts,
  longestReadPosts,
  shortestReadPosts,
  blogSourceShare,
  topPageDetails,
  onSelectTopPage,
}: TrafficBlogViewProps) {
  const [blogSortKey, setBlogSortKey] = useState<"sessions" | "views" | "avgDuration">("sessions");
  const [blogSortDir, setBlogSortDir] = useState<"asc" | "desc">("desc");

  const blogPerformanceRows = useMemo(() => {
    const rows = (blogGa4Data?.blogPostStats ?? []).map((item) => ({
      path: item.path,
      views: item.pageViews,
      sessions: topPageDetails[item.path]?.summary.sessions ?? 0,
      avgDuration: item.avgDuration,
    }));
    return rows.sort((a, b) =>
      blogSortDir === "desc" ? b[blogSortKey] - a[blogSortKey] : a[blogSortKey] - b[blogSortKey]
    );
  }, [blogGa4Data, topPageDetails, blogSortKey, blogSortDir]);

  function handleBlogSort(key: string) {
    const k = key as "sessions" | "views" | "avgDuration";
    if (k === blogSortKey) {
      setBlogSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setBlogSortKey(k);
      setBlogSortDir("desc");
    }
  }

  const getTitle = (path: string) =>
    blogTitleMap.get(getBlogSlugFromPath(path) ?? "") ?? path;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="추적 글 수"
          value={activeBlogPosts.toLocaleString("ko-KR")}
          loading={blogGa4Loading && activeBlogPosts === 0}
        />
        <MetricCard
          label="평균 체류"
          value={blogSummary.avgDuration > 0 ? formatDuration(blogSummary.avgDuration) : "—"}
          loading={blogGa4Loading && blogSummary.avgDuration === 0}
        />
        <MetricCard
          label="세션 수"
          value={blogAggregateDetail?.summary.sessions.toLocaleString("ko-KR") ?? "—"}
        />
        <MetricCard
          label="페이지뷰"
          value={blogSummary.pageViews.toLocaleString("ko-KR")}
          loading={blogGa4Loading && blogSummary.pageViews === 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label={`${period === "30d" ? "30일" : period === "90d" ? "90일" : "180일"} 공유 시도`}
          value={conversionData?.configured ? conversionData.summary.totalShareActions.toLocaleString("ko-KR") : "설정 필요"}
          color="text-sky-700"
          loading={conversionLoading}
        />
        <MetricCard
          label={`${period === "30d" ? "30일" : period === "90d" ? "90일" : "180일"} 공유 유입`}
          value={conversionData?.configured ? conversionData.summary.totalShareVisits.toLocaleString("ko-KR") : "설정 필요"}
          color="text-violet-700"
          loading={conversionLoading}
        />
        <MetricCard
          label="공유 유입률"
          value={
            conversionData?.configured
              ? conversionData.summary.shareVisitRate === null
                ? "—"
                : `${conversionData.summary.shareVisitRate}%`
              : "설정 필요"
          }
          color="text-emerald-700"
          loading={conversionLoading}
        />
        <MetricCard
          label="네이티브/복사"
          value={
            conversionData?.configured
              ? `${conversionData.summary.nativeShareActions}/${conversionData.summary.copyShareActions}`
              : "설정 필요"
          }
          color="text-[var(--color-gold-dark)]"
          loading={conversionLoading}
        />
      </div>

      {blogGa4Error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          블로그 평균 체류 집계 일부를 불러오지 못했습니다. 글별 조회와 드릴다운은 계속 볼 수 있습니다.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="오래 읽힌 글">
          <div className="space-y-2">
            {longestReadPosts.length > 0 ? longestReadPosts.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onSelectTopPage(item.path)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
              >
                <div className="min-w-0 pr-3">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                  >
                    {getTitle(item.path)}
                  </a>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    평균 체류 {formatDuration(item.avgDuration)} · 페이지뷰 {item.pageViews.toLocaleString("ko-KR")}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
                    {item.path}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-emerald-600">상세 보기</span>
              </button>
            )) : (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                표시할 체류 데이터가 없습니다.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="짧게 보고 나간 글">
          <div className="space-y-2">
            {shortestReadPosts.length > 0 ? shortestReadPosts.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onSelectTopPage(item.path)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
              >
                <div className="min-w-0 pr-3">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                  >
                    {getTitle(item.path)}
                  </a>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    평균 체류 {formatDuration(item.avgDuration)} · 페이지뷰 {item.pageViews.toLocaleString("ko-KR")}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-[var(--muted)]">
                    {item.path}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-600">상세 보기</span>
              </button>
            )) : (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                표시할 체류 데이터가 없습니다.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="글별 방문 성과">
        <>
          <div className="space-y-2 sm:hidden">
            <div className="flex items-center gap-2 pb-1 text-xs text-[var(--muted)]">
              <span>정렬:</span>
              {(["sessions", "views", "avgDuration"] as const).map((k) => {
                const labels = { sessions: "세션수", views: "페이지뷰", avgDuration: "평균체류" };
                const active = blogSortKey === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleBlogSort(k)}
                    className={`rounded-full px-2 py-0.5 transition-colors ${active ? "bg-[var(--color-primary)] text-white" : "bg-[var(--border)] text-[var(--foreground)] hover:bg-[var(--color-primary)]/20"}`}
                  >
                    {labels[k]}{active ? (blogSortDir === "desc" ? " ▼" : " ▲") : ""}
                  </button>
                );
              })}
            </div>
            {blogPerformanceRows.length > 0 ? blogPerformanceRows.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onSelectTopPage(item.path)}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left transition-colors hover:border-[var(--color-primary)]/40"
              >
                <div className="min-w-0 pr-3">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                  >
                    {getTitle(item.path)}
                  </a>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    세션 {item.sessions.toLocaleString("ko-KR")} · 페이지뷰 {item.views.toLocaleString("ko-KR")} · 평균 체류 {item.avgDuration > 0 ? formatDuration(item.avgDuration) : "—"}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-[var(--muted)]">{item.path}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[var(--color-primary)]">
                  상세 보기
                </span>
              </button>
            )) : (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                블로그 방문 성과 데이터가 없습니다.
              </p>
            )}
          </div>

          <div className="hidden sm:block">
            <DataTable
              keyField="path"
              rows={blogPerformanceRows as unknown as Record<string, unknown>[]}
              sortKey={blogSortKey}
              sortDirection={blogSortDir}
              onSort={handleBlogSort}
              columns={[
                {
                  key: "path",
                  label: "글",
                  align: "left",
                  render: (row) => {
                    const path = String((row as { path: string }).path);
                    return (
                      <div className="min-w-0">
                        <a
                          href={path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="block max-w-[280px] truncate text-left font-medium text-[var(--foreground)] hover:text-[var(--color-primary)] hover:underline"
                          title={path}
                        >
                          {getTitle(path)}
                        </a>
                        <p className="mt-1 block max-w-[280px] truncate text-left text-[11px] text-[var(--muted)]" title={path}>
                          {path}
                        </p>
                      </div>
                    );
                  },
                },
                {
                  key: "sessions",
                  label: "세션 수",
                  align: "right",
                  sortable: true,
                  render: (row) => Number((row as { sessions: number }).sessions).toLocaleString("ko-KR"),
                },
                {
                  key: "views",
                  label: "페이지뷰",
                  align: "right",
                  sortable: true,
                  render: (row) => Number((row as { views: number }).views).toLocaleString("ko-KR"),
                },
                {
                  key: "avgDuration",
                  label: "평균 체류",
                  align: "right",
                  sortable: true,
                  render: (row) => {
                    const avgDuration = Number((row as { avgDuration: number }).avgDuration);
                    return avgDuration > 0 ? formatDuration(avgDuration) : "—";
                  },
                },
                {
                  key: "detail",
                  label: "",
                  align: "right",
                  render: (row) => {
                    const path = String((row as { path: string }).path);
                    return (
                      <button
                        type="button"
                        onClick={() => onSelectTopPage(path)}
                        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        상세 보기
                      </button>
                    );
                  },
                },
              ]}
              emptyMessage="블로그 방문 성과 데이터가 없습니다."
            />
          </div>
        </>
      </SectionCard>

      <SectionCard title="유입 구조">
        <div className="space-y-2">
          {blogSourceShare.length > 0 ? blogSourceShare.map((item) => (
            <div
              key={item.source}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
            >
              <span className="truncate pr-3 font-medium text-[var(--foreground)]">{item.source}</span>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {item.sessions.toLocaleString("ko-KR")}세션 · {item.percentage}%
              </span>
            </div>
          )) : (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              표시할 유입 구조 데이터가 없습니다.
            </p>
          )}
        </div>
      </SectionCard>
    </>
  );
}
