"use client";

import { useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { forceRefetchAdminApi, useAdminApi } from "../useAdminApi";
import { AdminLoadingSkeleton } from "../AdminLoadingSkeleton";
import { AdminErrorState } from "../AdminErrorState";
import { ApiSourceBadge } from "./ApiSourceBadge";
import type { StrategyOverviewData } from "./shared";
import { EvidenceDataSection } from "./strategy-evidence";
import { OpportunityScatter, type ScatterPoint } from "./strategy-shared";

export function StrategySubTab() {
  const endpoint = "/api/admin/naver-datalab/trend-summary?mode=strategy&detail=short";
  const strategy = useAdminApi<StrategyOverviewData>(endpoint);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const contentGap = useMemo(() => strategy.data?.contentGap ?? [], [strategy.data?.contentGap]);
  const scatterData = useMemo<ScatterPoint[]>(() => contentGap
    .filter((gap) => gap.monthlyVolume != null && gap.monthlyVolume > 0)
    .map((gap) => ({
      subGroup: gap.subGroup,
      category: gap.category,
      slug: gap.slug,
      x: gap.monthlyVolume ?? 0,
      y: gap.existingPostCount,
      z: gap.gapScore,
      searchIntent: gap.searchIntent,
    })), [contentGap]);

  if (strategy.loading) return <AdminLoadingSkeleton variant="full" />;
  if (strategy.error) return <AdminErrorState message={strategy.error} />;
  if (!strategy.data) {
    return <AdminErrorState message="네이버 DataLab API 설정이 없어 기회 분석 데이터를 만들 수 없습니다." />;
  }

  const urgentCount = contentGap.filter((item) => item.gapScore >= 70).length;
  const uncoveredCount = contentGap.filter((item) => item.existingPostCount === 0).length;
  const pageOpportunityCount = strategy.data.pageOpportunities.length;

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverDatalab", "naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <AdminPill tone="white">기회 분석</AdminPill>
              <AdminPill tone={urgentCount > 0 ? "warning" : "white"}>
                {urgentCount > 0 ? `시급한 갭 ${urgentCount}개` : "시급한 갭 없음"}
              </AdminPill>
            </div>
            <h1 className="mt-3 text-xl font-bold text-[var(--foreground)]">
              검색 수요와 현재 콘텐츠의 차이를 분석합니다.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              검색량, 기존 포스트, 검색 의도를 함께 비교합니다. 실행할 작업은 콘텐츠 플래너에서 관리하세요.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {strategy.data.period?.end ? `DataLab ${strategy.data.period.end} 기준` : "DataLab 기준일 확인 불가"}
              {strategy.data.volumeCoverage != null ? ` · 검색량 커버리지 ${Math.round(strategy.data.volumeCoverage * 100)}%` : " · 검색량 커버리지 확인 불가"}
              {` · ${formatFetchedAt(strategy.data.meta.fetchedAt)} 분석`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminActionLink tone="primary" href="/admin/content/planner">
                콘텐츠 플래너 열기
              </AdminActionLink>
              <AdminActionButton
                tone="dark"
                disabled={refreshing || strategy.isValidating}
                onClick={async () => {
                  setRefreshing(true);
                  setRefreshError(null);
                  try {
                    await forceRefetchAdminApi<StrategyOverviewData>(endpoint);
                  } catch (error) {
                    setRefreshError(error instanceof Error ? error.message : "최신 데이터를 불러오지 못했습니다.");
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "최신 데이터 확인 중…" : "최신 데이터 확인"}
              </AdminActionButton>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            <Metric label="분석 주제" value={contentGap.length} />
            <Metric label="콘텐츠 없음" value={uncoveredCount} />
            <Metric label="페이지 보강" value={pageOpportunityCount} />
          </div>
        </div>
      </AdminSurface>

      {refreshError && <AdminNotice tone="error">{refreshError}</AdminNotice>}

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
        contentGap={contentGap}
        insightActions={strategy.data.insightActions}
        pageOpportunities={strategy.data.pageOpportunities}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-center">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
