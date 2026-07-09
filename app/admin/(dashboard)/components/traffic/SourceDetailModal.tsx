"use client";

import { useModalA11y } from "@/hooks/useModalA11y";
import { MetricCard } from "../MetricCard";
import { formatDuration } from "../insight/shared";
import { TopPagesChart, DailyTrendChart } from "./charts";
import type { SourceDetail } from "./types";

interface SourceDetailModalProps {
  source: string;
  detail: SourceDetail;
  onClose: () => void;
}

export function SourceDetailModal({ source, detail, onClose }: SourceDetailModalProps) {
  const modalRef = useModalA11y(onClose);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${source} 유입경로 상세`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[1.75rem] bg-[var(--background)] p-4 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-[var(--foreground)]">
              {source} 상세
            </h4>
            <p className="mt-1 text-xs text-[var(--muted)]">
              검색어는 직접 알 수 없지만, 어떤 페이지로 얼마나 질 좋게 유입되는지는 바로 볼 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted)]">
              세션 {detail.summary.sessions.toLocaleString("ko-KR")}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)]"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="참여 세션"
            value={detail.summary.engagedSessions.toLocaleString("ko-KR")}
          />
          <MetricCard
            label="참여율"
            value={`${detail.summary.engagementRate.toFixed(1)}%`}
          />
          <MetricCard
            label="평균 체류"
            value={formatDuration(detail.summary.avgDuration)}
          />
          <MetricCard
            label="세션당 페이지뷰"
            value={detail.summary.pageviewsPerSession.toFixed(2)}
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">
              이 유입의 랜딩 페이지 TOP
            </h5>
            <p className="mt-1 text-xs text-[var(--muted)]">
              어떤 페이지가 해당 유입을 실제로 받고 있는지 봅니다.
            </p>
            <div className="mt-3">
              <TopPagesChart data={detail.topLandingPages} />
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <h5 className="text-sm font-semibold text-[var(--foreground)]">
              이 유입의 기간별 추이
            </h5>
            <p className="mt-1 text-xs text-[var(--muted)]">
              최근 들어 늘고 있는 유입인지 빠르게 확인할 수 있습니다.
            </p>
            <div className="mt-3">
              <DailyTrendChart data={detail.dailyTrend} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
