"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { forceRefetchAdminApi, useAdminApi, useAdminMutation } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import type { StrategyOverviewData } from "./shared";
import { EvidenceDataSection } from "./strategy-evidence";
import { OpportunityScatter, type ScatterPoint } from "./strategy-shared";
import type { SearchAdSyncState } from "@/lib/admin-searchad-snapshots";
import type { ContentPlannerItem } from "@/lib/content-planner";
import { CONTENT_GAP_LARGE_THRESHOLD, isContentGapApplicable } from "@/lib/trend-analysis";

export function StrategySubTab() {
  const endpoint = "/api/admin/naver-datalab/trend-summary?mode=strategy&detail=short";
  const syncEndpoint = "/api/admin/naver-searchad/sync";
  const strategy = useAdminApi<StrategyOverviewData>(endpoint);
  const sync = useAdminApi<SearchAdSyncState>(syncEndpoint);
  const planner = useAdminApi<ContentPlannerItem[]>("/api/admin/content-planner");
  const { mutate: startSync, loading: startingSync, error: syncMutationError } = useAdminMutation<SearchAdSyncState>();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const observedActiveJob = useRef<string | null>(null);

  const syncIsActive = sync.data?.status === "queued" || sync.data?.status === "running";
  const syncJobId = sync.data?.jobId ?? null;
  const refetchSync = sync.refetch;

  useEffect(() => {
    if (!syncIsActive) return;
    observedActiveJob.current = syncJobId;
    const timer = window.setInterval(() => refetchSync(), 3_000);
    return () => window.clearInterval(timer);
  }, [refetchSync, syncIsActive, syncJobId]);

  useEffect(() => {
    if (sync.data?.status !== "completed" || !sync.data.jobId) return;
    if (observedActiveJob.current !== sync.data.jobId) return;
    observedActiveJob.current = null;
    void forceRefetchAdminApi<StrategyOverviewData>(endpoint).catch((error) => {
      setRefreshError(error instanceof Error ? error.message : "새 스냅샷을 반영하지 못했습니다.");
    });
  }, [endpoint, sync.data?.jobId, sync.data?.status]);

  const contentGap = useMemo(() => strategy.data?.contentGap ?? [], [strategy.data?.contentGap]);
  const evaluatedContentGap = useMemo(
    () => contentGap.filter((gap) => isContentGapApplicable(gap.category, gap.subGroup)),
    [contentGap],
  );
  const opportunityEvaluations = useMemo(() => strategy.data?.opportunityEvaluations ?? [], [strategy.data?.opportunityEvaluations]);
  const scatterData = useMemo<ScatterPoint[]>(() => evaluatedContentGap
    .filter((gap) => gap.monthlyVolume != null && gap.monthlyVolume > 0)
    .map((gap) => ({
      subGroup: gap.subGroup,
      category: gap.category,
      slug: gap.slug,
      x: gap.monthlyVolume ?? 0,
      y: gap.contentGapScore,
      searchIntent: gap.searchIntent,
    })), [evaluatedContentGap]);

  if (strategy.loading) return <AdminLoadingSkeleton variant="full" />;
  if (strategy.error) return <AdminErrorState message={strategy.error} />;
  if (!strategy.data) {
    return <AdminErrorState message="네이버 DataLab API 설정이 없어 기회 분석 데이터를 만들 수 없습니다." />;
  }

  const urgentCount = opportunityEvaluations.filter((item) => item.actions.some((action) => action.eligibility === "eligible" && (action.valueScore ?? 0) >= 70)).length;
  const measuredDemand = contentGap.reduce((sum, item) => sum + (item.monthlyVolume ?? 0), 0);
  const actionableBlogKeys = new Set(opportunityEvaluations
    .filter((item) => item.actions.some((action) => action.actionType === "blog" && action.eligibility === "eligible"))
    .map((item) => item.key));
  const unmetDemand = evaluatedContentGap
    .filter((item) => item.contentGapScore >= CONTENT_GAP_LARGE_THRESHOLD && actionableBlogKeys.has(`${item.slug}:${item.subGroup}`))
    .reduce((sum, item) => sum + (item.monthlyVolume ?? 0), 0);
  const hasMeasuredDemand = contentGap.some((item) => item.monthlyVolume != null);

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverDatalab", "naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <AdminPill tone="white">기회 분석</AdminPill>
            </div>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">
              검색 수요와 현재 콘텐츠의 차이를 분석합니다.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              검색량, 기존 포스트, 검색 의도를 함께 비교합니다. 실행할 작업은 콘텐츠 플래너에서 관리하세요.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {strategy.data.period?.end ? `DataLab ${strategy.data.period.end} 기준` : "DataLab 기준일 확인 불가"}
              {strategy.data.volumeCoverage != null ? ` · 커버리지 ${Math.round(strategy.data.volumeCoverage * 100)}%` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="primary" href="/admin/content/planner">
                콘텐츠 플래너 열기
              </AdminActionLink>
              <AdminActionButton
                tone="dark"
                disabled={startingSync || syncIsActive}
                onClick={async () => {
                  setRefreshError(null);
                  const result = await startSync(syncEndpoint, "POST");
                  if (result.data?.jobId) {
                    observedActiveJob.current = result.data.jobId;
                    sync.refetch();
                  }
                }}
              >
                <RefreshCw className={`h-4 w-4 ${startingSync || syncIsActive ? "animate-spin" : ""}`} />
                {startingSync ? "갱신 시작 중…" : syncIsActive ? "통합 데이터 수집 중…" : "최신 데이터 확인"}
              </AdminActionButton>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            <Metric label="전체 검색 수요" value={formatMonthlyDemand(measuredDemand, hasMeasuredDemand)} />
            <Metric label="블로그 미충족 수요" value={formatMonthlyDemand(unmetDemand, hasMeasuredDemand)} />
            <Metric label="고우선 기회" value={`${urgentCount}개`} />
          </div>
        </div>
      </AdminSurface>

      {(refreshError || syncMutationError || sync.data?.error) && (
        <AdminNotice tone="error">{refreshError ?? syncMutationError ?? sync.data?.error}</AdminNotice>
      )}

      {scatterData.length > 0 && (
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">기회 매트릭스</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            검색량이 높고 기존 콘텐츠가 적은 주제를 우선적으로 확인합니다.
          </p>
          <div className="mt-5">
            <OpportunityScatter data={scatterData} />
          </div>
        </AdminSurface>
      )}

      <EvidenceDataSection
        contentGap={evaluatedContentGap}
        insightActions={strategy.data.insightActions ?? []}
        pageOpportunities={strategy.data.pageOpportunities ?? []}
        candidateKeys={new Set([
          ...(strategy.data.blogBriefs ?? []).map((brief) => `blog:${brief.slug}:${brief.subGroup}`),
          ...(strategy.data.pageBriefs ?? []).map((brief) => `page:${brief.targetPage}`),
          ...(strategy.data.faqSuggestions ?? []).map((brief) => `faq:${brief.slug}:${brief.subGroup}`),
        ])}
        plannedKeys={new Set((planner.data ?? []).map((item) => item.opportunityKey))}
        visiblePlanKeys={new Set((planner.data ?? [])
          .filter((item) => ["approved", "in_progress", "review", "scheduled", "published"].includes(item.status))
          .map((item) => item.opportunityKey))}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function formatMonthlyDemand(value: number, available: boolean): string {
  return available ? `${value.toLocaleString("ko-KR")}/월` : "확인 불가";
}
