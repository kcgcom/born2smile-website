"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import type {
  KeywordChartItem,
  PageQueryDrilldownProps,
  QueryPageDrilldownProps,
} from "./search-types";
import {
  getEditableBlogSlug,
  getMetaChecklist,
  getQueryActionRecommendation,
} from "./search-utils";

// ---------------------------------------------------------------
// KeywordBarChart (dynamic Recharts import)
// ---------------------------------------------------------------

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
// PageQueryDrilldown
// ---------------------------------------------------------------

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

// ---------------------------------------------------------------
// QueryPageDrilldown
// ---------------------------------------------------------------

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
