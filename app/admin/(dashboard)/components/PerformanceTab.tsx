"use client";

import { useState, useCallback } from "react";
import { Smartphone, Monitor, Info, RefreshCw, ChevronDown } from "lucide-react";
import { mutate as globalMutate } from "swr";
import { getFirebaseAuth } from "@/lib/firebase";
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

interface PSIAuditItem {
  url: string;
  wastedMs?: number;
  wastedBytes?: number;
  totalBytes?: number;
}

interface PSIAudit {
  id: string;
  title: string;
  score: number | null;
  displayValue?: string;
  description?: string;
  savingsMs?: number;
  savingsBytes?: number;
  items?: PSIAuditItem[];
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

interface SinglePSIData {
  result: PSIResult;
  stale?: boolean;
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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > 60 ? path.slice(0, 57) + "…" : path;
  } catch {
    return url.length > 60 ? url.slice(0, 57) + "…" : url;
  }
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
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const { data: mobileData, loading: mobileLoading, error: mobileError } =
    useAdminApi<SinglePSIData>("/api/dev/pagespeed?strategy=mobile");
  const { data: desktopData, loading: desktopLoading, error: desktopError } =
    useAdminApi<SinglePSIData>("/api/dev/pagespeed?strategy=desktop");

  const currentData = strategy === "mobile" ? mobileData : desktopData;
  const currentLoading = strategy === "mobile" ? mobileLoading : desktopLoading;
  const currentError = strategy === "mobile" ? mobileError : desktopError;

  const result = currentData?.result ?? null;
  const isStaleResponse = currentData?.stale === true;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/dev/pagespeed?strategy=${strategy}&force=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        // SWR 캐시를 새 데이터로 갱신
        await globalMutate(`/api/dev/pagespeed?strategy=${strategy}`, json.data, false);
      }
    } finally {
      setRefreshing(false);
    }
  }, [strategy]);

  if (currentLoading && !result) {
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

  if (currentError && !result) {
    return <AdminErrorState message={currentError} onRetry={handleRefresh} />;
  }

  if (!result) return null;

  const fetchedDate = new Date(result.fetchedAt);
  const fetchedTime = fetchedDate.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }) + " " + fetchedDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const overallBadge = categoryBadge(result.overallCategory);
  const hasCWV = result.coreWebVitals.some((m) => m.percentile != null);

  return (
    <div className="space-y-6">
      {/* 전략 토글 + 새로 분석 + 분석 시각 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            새로 분석
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {isStaleResponse && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              이전 데이터 · 갱신 중
            </span>
          )}
          <span className="text-xs text-[var(--muted)]">
            {fetchedTime}
          </span>
        </div>
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
            {result.audits.map((audit) => {
              const isExpanded = expandedAudit === audit.id;
              const hasDetails =
                audit.description || audit.savingsMs || audit.savingsBytes || audit.items?.length;

              return (
                <div key={audit.id} className="rounded-lg bg-[var(--background)] overflow-hidden">
                  {/* 헤더 행 */}
                  <button
                    type="button"
                    onClick={() =>
                      hasDetails &&
                      setExpandedAudit(isExpanded ? null : audit.id)
                    }
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left ${
                      hasDetails ? "cursor-pointer hover:bg-gray-50/50" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {hasDetails && (
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-[var(--muted)] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      )}
                      <span className="text-sm text-[var(--foreground)] truncate">
                        {audit.title}
                      </span>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {audit.savingsMs != null && audit.savingsMs > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          -{audit.savingsMs >= 1000
                            ? `${(audit.savingsMs / 1000).toFixed(1)}s`
                            : `${audit.savingsMs}ms`}
                        </span>
                      )}
                      {audit.savingsBytes != null && audit.savingsBytes > 0 && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          -{formatBytes(audit.savingsBytes)}
                        </span>
                      )}
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
                  </button>

                  {/* 확장 상세 */}
                  {isExpanded && hasDetails && (
                    <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                      {audit.description && (
                        <p className="text-xs leading-relaxed text-[var(--muted)]">
                          {audit.description}
                        </p>
                      )}
                      {audit.items && audit.items.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                            관련 리소스
                          </p>
                          <div className="rounded-md border border-gray-100 divide-y divide-gray-100 text-xs">
                            {audit.items.map((item, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-2 px-3 py-1.5"
                              >
                                <span
                                  className="truncate text-[var(--foreground)] font-mono text-[11px]"
                                  title={item.url}
                                >
                                  {shortenUrl(item.url)}
                                </span>
                                <div className="flex shrink-0 items-center gap-2 text-[var(--muted)]">
                                  {item.wastedMs != null && item.wastedMs > 0 && (
                                    <span>{item.wastedMs >= 1000 ? `${(item.wastedMs / 1000).toFixed(1)}s` : `${item.wastedMs}ms`}</span>
                                  )}
                                  {item.wastedBytes != null && item.wastedBytes > 0 && (
                                    <span>{formatBytes(item.wastedBytes)}</span>
                                  )}
                                  {item.totalBytes != null && !item.wastedBytes && (
                                    <span>{formatBytes(item.totalBytes)}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
