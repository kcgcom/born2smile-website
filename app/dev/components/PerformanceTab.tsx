"use client";

import { useState } from "react";
import { Smartphone, Monitor, Info } from "lucide-react";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";

// --- Types ---

interface PSICategory {
  id: string;
  title: string;
  score: number | null;
}

interface CWVMetric {
  id: string;
  label: string;
  percentile: number | null;
  unit: string;
  category: string;
}

interface PSIAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue?: string;
}

interface PSIResult {
  strategy: "mobile" | "desktop";
  fetchedAt: string;
  url: string;
  categories: PSICategory[];
  coreWebVitals: CWVMetric[];
  overallCategory: string;
  audits: PSIAudit[];
}

interface PSIResponseData {
  mobile: PSIResult | null;
  desktop: PSIResult | null;
}

// --- Helpers ---

function scoreColor(score: number | null): string {
  if (score == null) return "#9CA3AF";
  if (score >= 90) return "#0CCE6B";
  if (score >= 50) return "#FFA400";
  return "#FF4E42";
}

function scoreBg(score: number | null): string {
  if (score == null) return "bg-gray-100 text-gray-500";
  if (score >= 90) return "bg-green-50 text-green-700";
  if (score >= 50) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

function categoryBadge(cat: string): { label: string; className: string } {
  switch (cat) {
    case "FAST":
      return { label: "양호", className: "bg-green-100 text-green-700" };
    case "AVERAGE":
      return { label: "개선 필요", className: "bg-orange-100 text-orange-700" };
    case "SLOW":
      return { label: "느림", className: "bg-red-100 text-red-700" };
    default:
      return { label: "N/A", className: "bg-gray-100 text-gray-500" };
  }
}

function formatCWVValue(metric: CWVMetric): string {
  if (metric.percentile == null) return "—";
  if (metric.label === "CLS") return (metric.percentile / 100).toFixed(2);
  if (metric.percentile >= 1000)
    return `${(metric.percentile / 1000).toFixed(1)}s`;
  return `${metric.percentile}ms`;
}

// --- Inline Components ---

function ScoreGauge({
  score,
  label,
}: {
  score: number | null;
  label: string;
}) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? (score / 100) * circumference : 0;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-lg font-bold"
          fill={color}
        >
          {score ?? "—"}
        </text>
      </svg>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

function CWVCard({ metric }: { metric: CWVMetric }) {
  const badge = categoryBadge(metric.category);
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--background)] p-3 text-center">
      <span className="text-lg font-bold text-[var(--foreground)]">
        {formatCWVValue(metric)}
      </span>
      <span className="text-xs font-medium text-[var(--muted)]">
        {metric.label}
      </span>
      <span
        className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
      >
        {badge.label}
      </span>
    </div>
  );
}

// --- Main Component ---

export function PerformanceTab() {
  const { data, loading, error, refetch } =
    useAdminApi<PSIResponseData>("/api/dev/pagespeed");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          PageSpeed 분석 중... (최대 30초 소요)
        </div>
        <AdminLoadingSkeleton variant="full" />
      </div>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={() => refetch()} />;
  }

  if (!data) return null;

  const result = strategy === "mobile" ? data.mobile : data.desktop;

  if (!result) {
    return (
      <AdminErrorState
        message={`${strategy === "mobile" ? "모바일" : "데스크톱"} 분석 결과를 가져올 수 없습니다`}
        onRetry={() => refetch()}
      />
    );
  }

  const fetchedTime = new Date(result.fetchedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const overallBadge = categoryBadge(result.overallCategory);
  const hasCWV = result.coreWebVitals.some((m) => m.percentile != null);

  return (
    <div className="space-y-6">
      {/* 전략 토글 + 분석 시각 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-[var(--background)] p-1">
          <button
            onClick={() => setStrategy("mobile")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              strategy === "mobile"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Smartphone size={14} />
            모바일
          </button>
          <button
            onClick={() => setStrategy("desktop")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              strategy === "desktop"
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Monitor size={14} />
            데스크톱
          </button>
        </div>
        <span className="text-xs text-[var(--muted)]">
          분석 시각: {fetchedTime}
        </span>
      </div>

      {/* Lighthouse 카테고리 점수 */}
      <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          Lighthouse 점수
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {result.categories.map((cat) => (
            <ScoreGauge key={cat.id} score={cat.score} label={cat.title} />
          ))}
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Core Web Vitals (필드 데이터)
          </h3>
          {hasCWV && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${overallBadge.className}`}
            >
              전체: {overallBadge.label}
            </span>
          )}
        </div>
        {hasCWV ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {result.coreWebVitals.map((metric) => (
              <CWVCard key={metric.id} metric={metric} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--background)] px-4 py-3 text-sm text-[var(--muted)]">
            <Info size={16} className="shrink-0" />
            CrUX 필드 데이터가 아직 수집되지 않았습니다. 트래픽이 충분히 쌓이면
            표시됩니다.
          </div>
        )}
      </div>

      {/* 개선 기회 */}
      {result.audits.length > 0 && (
        <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
            개선 기회 ({result.audits.length}개)
          </h3>
          <div className="space-y-2">
            {result.audits.map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between rounded-lg bg-[var(--background)] px-4 py-2.5"
              >
                <span className="text-sm text-[var(--foreground)]">
                  {audit.title}
                </span>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  {audit.displayValue && (
                    <span className="text-xs text-[var(--muted)]">
                      {audit.displayValue}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreBg(audit.score)}`}
                  >
                    {audit.score ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 테스트 URL */}
      <p className="text-center text-xs text-[var(--muted)]">
        테스트 URL: {result.url}
      </p>
    </div>
  );
}
