"use client";

import { useState, useRef, useCallback } from "react";
import { Smartphone, Monitor, RefreshCw, ChevronDown } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { forceRefetchAdminApi, useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { ApiSourceBadge } from "@/app/admin/(dashboard)/components/insight/ApiSourceBadge";
import { CruxPanel } from "./CruxPanel";
import { PAGESPEED_TARGETS, type PageSpeedTarget } from "@/lib/pagespeed-targets";

// --- Types ---

interface PSICategory {
  id: string;
  title: string;
  score: number | null;
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
  audits: PSIAudit[];
}

interface SinglePSIData {
  result: PSIResult | null;
  stale?: boolean;
}

type Strategy = "mobile" | "desktop";

// --- Helpers ---

function scoreColor(score: number | null): string {
  if (score == null) return "#9CA3AF";
  if (score >= 90) return "#0CCE6B";
  if (score >= 50) return "#FFA400";
  return "#FF4E42";
}

function scoreBg(score: number | null): string {
  if (score == null) return "bg-[var(--background)] text-[var(--muted)]";
  if (score >= 90) return "bg-green-50 text-green-700";
  if (score >= 50) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const CATEGORY_LABELS: Record<string, string> = {
  performance: "성능", accessibility: "접근성", seo: "검색 최적화", "best-practices": "권장사항",
};

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
          className="transition-all duration-700 motion-reduce:transition-none"
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
      <span className="sr-only">점수: {score ?? "없음"}</span>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

// --- Main Component ---

export function PerformanceTab() {
  const [page, setPage] = useState<PageSpeedTarget>(PAGESPEED_TARGETS[0]);
  const [strategy, setStrategy] = useState<Strategy>("mobile");

  return (
    <div className="space-y-5">
      <ApiSourceBadge sources={["pagespeedInsights"]} />
      <header>
        <h1 className="text-xl font-bold text-slate-900">사이트 성능</h1>
        <p className="mt-1 text-sm text-slate-600">페이지별 Lighthouse 검사와 전체 사이트의 실사용 성능을 확인합니다.</p>
      </header>
      <AdminSurface tone="white" className="rounded-2xl p-4">
        <label htmlFor="pagespeed-target" className="block text-sm font-semibold text-slate-900">Lighthouse 검사 페이지</label>
        <select
          id="pagespeed-target"
          value={page.id}
          onChange={event => {
            const selected = PAGESPEED_TARGETS.find(target => target.id === event.target.value);
            if (selected) setPage(selected);
          }}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700 sm:max-w-md"
        >
          {PAGESPEED_TARGETS.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
        </select>
        {page.id !== "home" && <p className="mt-2 text-xs text-slate-600">이 페이지는 새로 분석을 눌러 측정합니다.</p>}
      </AdminSurface>
      <PageSpeedResults key={page.id} page={page} strategy={strategy} setStrategy={setStrategy} />
      <CruxPanel />
    </div>
  );
}

function PageSpeedResults({ page, strategy, setStrategy }: {
  page: PageSpeedTarget;
  strategy: Strategy;
  setStrategy: (strategy: Strategy) => void;
}) {
  const [refreshingStrategy, setRefreshingStrategy] = useState<Strategy | null>(null);
  const refreshLock = useRef(false);
  const [refreshErrors, setRefreshErrors] = useState<Partial<Record<Strategy, string>>>({});
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const home = page.id === "home";
  const targetQuery = home ? "" : `&target=${page.id}`;
  const mobileEndpoint = `/api/dev/pagespeed?strategy=mobile${targetQuery}`;
  const desktopEndpoint = `/api/dev/pagespeed?strategy=desktop${targetQuery}`;
  const { data: mobileData, loading: mobileLoading, isValidating: mobileValidating, error: mobileError } =
    useAdminApi<SinglePSIData>(mobileEndpoint, home || strategy === "mobile");
  const desktopEnabled = strategy === "desktop" || (home && (Boolean(mobileData) || Boolean(mobileError)));
  const { data: desktopData, loading: desktopLoading, isValidating: desktopValidating, error: desktopError } =
    useAdminApi<SinglePSIData>(desktopEndpoint, desktopEnabled);

  const currentData = strategy === "mobile" ? mobileData : desktopData;
  const currentLoading = strategy === "mobile" ? (mobileLoading || mobileValidating) : (desktopLoading || desktopValidating);
  const currentError = strategy === "mobile" ? mobileError : desktopError;

  const result = currentData?.result ?? null;
  const isStaleResponse = currentData?.stale === true;

  const refreshing = refreshingStrategy === strategy;
  const refreshError = refreshErrors[strategy];
  const handleRefresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshingStrategy(strategy);
    setRefreshErrors(previous => ({ ...previous, [strategy]: undefined }));
    try {
      await forceRefetchAdminApi<SinglePSIData>(strategy === "mobile" ? mobileEndpoint : desktopEndpoint);
    } catch (error) {
      setRefreshErrors(previous => ({ ...previous, [strategy]: error instanceof Error ? error.message : "분석을 완료하지 못했습니다. 다시 시도해 주세요." }));
    } finally {
      refreshLock.current = false;
      setRefreshingStrategy(null);
    }
  }, [strategy, mobileEndpoint, desktopEndpoint]);

  const fetchedTime = result ? new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(result.fetchedAt)) : null;
  return (
    <>
      <AdminSurface tone="white" className="space-y-3 rounded-2xl p-4">
        <div role="group" aria-label="측정 환경" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:max-w-sm">
          {(["mobile", "desktop"] as const).map(value => {
            const Icon = value === "mobile" ? Smartphone : Monitor;
            return <button key={value} type="button" aria-pressed={strategy === value}
              onClick={() => { setStrategy(value); setExpandedAudit(null); }}
              className={`flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${strategy === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>
              <Icon size={16} className="shrink-0" aria-hidden="true" />{value === "mobile" ? "모바일" : "데스크톱"}
            </button>;
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-slate-600">{fetchedTime ? `측정 ${fetchedTime} · 한국시간` : "아직 측정 결과가 없습니다."}</p>
          <AdminActionButton onClick={handleRefresh} disabled={refreshingStrategy !== null} tone="dark" className="shrink-0 whitespace-nowrap text-sm">
            <RefreshCw size={14} aria-hidden="true" className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
            {refreshing ? "분석 중…" : "새로 분석"}
          </AdminActionButton>
        </div>
        {isStaleResponse && <AdminPill tone="warning">이전 측정 결과</AdminPill>}
        {(refreshing || (currentLoading && !result)) && <p role="status" className="text-sm text-slate-600">PageSpeed 분석 중… 잠시 기다려 주세요.</p>}
        {isStaleResponse && !refreshing && <p className="text-xs leading-5 text-slate-600">서버에서 최신 결과를 갱신합니다. 잠시 후 새로 분석하여 확인할 수 있습니다.</p>}
      </AdminSurface>
      {(refreshError || currentError) && <AdminErrorState message={refreshError ?? currentError!} onRetry={refreshingStrategy === null ? handleRefresh : undefined} />}
      {result && (refreshError || currentError) && <p className="text-sm text-slate-600">분석에 실패해 이전 측정 결과를 표시합니다.</p>}
      {!result && (currentLoading || refreshing) && <AdminLoadingSkeleton variant="full" />}
      {!result && !currentLoading && !refreshing && !currentError && !refreshError && <p role="status" className="text-sm text-slate-600">측정 결과가 없습니다. 새로 분석을 눌러 주세요.</p>}
      {result && <>
        {/* Lighthouse 카테고리 점수 */}
        <AdminSurface tone="white" className="rounded-2xl p-6">
          <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
            Lighthouse 점수
          </h2>
          <p className="mb-4 text-xs leading-5 text-slate-600">시험 환경에서 측정한 100점 만점 점수입니다. 90점 이상 양호 · 50~89점 개선 필요 · 49점 이하 낮음</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {result.categories.map((cat) => (
              <ScoreGauge key={cat.id} score={cat.score} label={CATEGORY_LABELS[cat.id] ?? cat.title} />
            ))}
          </div>
        </AdminSurface>

        {/* 개선 기회 */}
        {result.audits.length > 0 && (
          <AdminSurface tone="white" className="rounded-2xl px-6 py-2">
            <details key={strategy} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-sm font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
                <h2>개선 항목 ({result.audits.length}개)</h2>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
              </summary>
              <div className="space-y-2 pb-4 pt-2">
                {result.audits.map((audit) => {
                  const isExpanded = expandedAudit === audit.id;
                  const hasDetails =
                    audit.description || audit.savingsMs || audit.savingsBytes || audit.items?.length;

                  return (
                    <div key={audit.id} className="overflow-hidden rounded-xl bg-[var(--background)]">
                      {/* 헤더 행 */}
                      <button
                        type="button"
                        onClick={() =>
                          hasDetails &&
                          setExpandedAudit(isExpanded ? null : audit.id)
                        }
                        aria-expanded={hasDetails ? isExpanded : undefined}
                        className={`flex w-full flex-col items-stretch gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 ${
                            hasDetails ? "cursor-pointer hover:bg-[var(--background)]/50" : "cursor-default"
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
                          <span className="min-w-0 break-words text-sm font-medium leading-6 text-[var(--foreground)]">
                            {audit.title}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {audit.savingsMs != null && audit.savingsMs > 0 && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              -{audit.savingsMs >= 1000
                                ? `${(audit.savingsMs / 1000).toFixed(1)}s`
                                : `${audit.savingsMs}ms`}
                            </span>
                          )}
                          {audit.savingsBytes != null && audit.savingsBytes > 0 && (
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              -{formatBytes(audit.savingsBytes)}
                            </span>
                          )}
                          {audit.displayValue && (
                            <span className="w-full break-words text-xs text-[var(--muted)]">
                              {audit.displayValue}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreBg(audit.score)}`}
                          >
                            점수 {audit.score ?? "—"}
                          </span>
                        </div>
                      </button>

                      {/* 확장 상세 */}
                      {isExpanded && hasDetails && (
                        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
                          {audit.description && (
                            <p className="text-xs leading-relaxed text-[var(--muted)]">
                              {audit.description}
                            </p>
                          )}
                          {audit.items && audit.items.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                                관련 리소스
                              </p>
                              <div className="rounded-md border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
                                {audit.items.map((item, i) => (
                                  <div
                                    key={i}
                                    className="min-w-0 space-y-2 px-3 py-2"
                                  >
                                    <span
                                      className="block select-text break-all font-mono text-xs leading-5 text-[var(--foreground)]"
                                    >
                                      {item.url}
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
            </details>
          </AdminSurface>
        )}

        {/* 테스트 URL */}
        <p className="break-all text-center text-xs text-[var(--muted)]">
          테스트 URL: {result.url}
        </p>
      </>}
    </>
  );
}
