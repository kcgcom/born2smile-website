"use client";

import { useModalA11y } from "@/hooks/useModalA11y";
import { MetricCard } from "../MetricCard";
import { formatDuration } from "../insight/shared";
import { TopPagesChart, DailyTrendChart } from "./charts";
import { formatDurationDelta } from "./types";
import type { TopPageDetail } from "./types";

interface TopPageDetailModalProps {
  path: string;
  title: string;
  detail: TopPageDetail;
  duration: number;
  avgDurationBaseline: number;
  onClose: () => void;
  onSelectTopPage: (path: string) => void;
}

export function TopPageDetailModal({
  path,
  title,
  detail,
  duration,
  avgDurationBaseline,
  onClose,
  onSelectTopPage,
}: TopPageDetailModalProps) {
  const modalRef = useModalA11y(onClose);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${path} 상세`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] bg-[var(--background)] p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {detail.isBlogAggregate
                ? "블로그 전체 유입을 묶어서 보여줍니다."
                : detail.isSectionAggregate
                  ? `${detail.aggregateLabel ?? "섹션"} 유입을 묶어서 보여줍니다.`
                  : "해당 페이지 단위의 세부 데이터를 보여줍니다."}
            </p>
            {!detail.isSectionAggregate && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">{path}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <MetricCard
            label="페이지뷰"
            value={detail.summary.views.toLocaleString("ko-KR")}
          />
          <MetricCard
            label="평균 체류"
            value={duration > 0 ? formatDuration(duration) : "—"}
          />
          <MetricCard
            label="읽힘 비교"
            value={duration > 0 ? formatDurationDelta(duration, avgDurationBaseline) : "—"}
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">
              최근 추이
            </h5>
            <div className="mt-3">
              <DailyTrendChart data={detail.dailyTrend} />
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">
              주요 유입경로
            </h5>
            <div className="mt-3 space-y-2">
              {detail.sources.length > 0 ? detail.sources.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                >
                  <span className="truncate pr-3 font-medium text-[var(--foreground)]">{item.source}</span>
                  <span className="shrink-0 text-xs text-[var(--muted)]">
                    {item.sessions.toLocaleString("ko-KR")}세션 · {item.percentage}%
                  </span>
                </div>
              )) : (
                <p className="text-sm text-[var(--muted)]">표시할 유입경로 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        {detail.isSectionAggregate && detail.topChildPages.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">
              {detail.isBlogAggregate
                ? "블로그에서 많이 본 글"
                : detail.aggregateLabel === "치료 페이지 전체"
                  ? "치료 페이지에서 많이 본 상세 페이지"
                  : "리서치에서 많이 본 상세 페이지"}
            </h5>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {detail.isBlogAggregate
                ? "블로그 전체 안에서 실제 조회를 만든 개별 글입니다. 막대를 누르면 그 글 상세로 이동합니다."
                : detail.aggregateLabel === "치료 페이지 전체"
                  ? "치료 페이지 전체 안에서 실제 조회를 만든 개별 페이지입니다. 막대를 누르면 그 페이지 상세로 이동합니다."
                  : "리서치 전체 안에서 실제 조회를 만든 개별 페이지입니다. 막대를 누르면 그 페이지 상세로 이동합니다."}
            </p>
            <div className="mt-3">
              <TopPagesChart
                data={detail.topChildPages}
                selectedPath={path}
                onSelect={onSelectTopPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
