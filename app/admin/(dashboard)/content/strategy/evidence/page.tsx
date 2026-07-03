"use client";

import { useAdminApi } from "../../../components/useAdminApi";
import { AdminLoadingSkeleton } from "../../../components/AdminLoadingSkeleton";
import { AdminErrorState } from "../../../components/AdminErrorState";
import { ApiSourceBadge } from "../../../components/insight/ApiSourceBadge";
import type { StrategyOverviewData } from "../../../components/insight/shared";
import { EvidenceDataSection } from "../../../components/insight/strategy-evidence";
import { OpportunityScatter, type ScatterPoint } from "../../../components/insight/strategy-shared";
import { calcTotalVolume } from "../../../components/insight/shared";
import { useMemo } from "react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { StrategyRulesPanel } from "../../../components/insight/strategy-panels";

export default function AdminContentStrategyEvidencePage() {
  const {
    data: overviewData,
    loading,
    error,
  } = useAdminApi<StrategyOverviewData>("/api/admin/naver-datalab/strategy-overview");

  const contentGap = useMemo(() => overviewData?.contentGap ?? [], [overviewData?.contentGap]);
  const insightActions = overviewData?.insightActions ?? [];
  const pageOpportunities = overviewData?.pageOpportunities ?? [];

  const scatterData: ScatterPoint[] = useMemo(
    () => contentGap
      .map((item) => ({ ...item, totalVolume: calcTotalVolume(item) }))
      .filter((g) => g.monthlyVolume != null && g.totalVolume > 0)
      .map((g) => ({
        subGroup: g.subGroup,
        category: g.category,
        slug: g.slug,
        x: g.totalVolume,
        y: g.existingPostCount,
        z: g.gapScore,
        searchIntent: g.searchIntent,
      })),
    [contentGap],
  );

  if (!loading && !error && overviewData === null) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <p className="text-sm text-[var(--muted)]">
          네이버 DataLab API 키가 설정되지 않았습니다.
        </p>
      </div>
    );
  }

  if (loading) return <AdminLoadingSkeleton variant="full" />;
  if (error) return <AdminErrorState message={error} />;
  if (!overviewData) return null;

  return (
    <div className="space-y-8">
      <ApiSourceBadge sources={["naverSearchAd"]} />

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <AdminPill tone="white">근거 데이터</AdminPill>
        <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">콘텐츠 갭 분석과 기회 매트릭스</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          검색량 대비 콘텐츠 부족도를 기반으로 우선순위를 산출합니다.
        </p>
      </AdminSurface>

      {scatterData.length > 0 && (
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">기회 매트릭스</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">검색량(X) × 기존 포스트(Y) 분포</p>
          <div className="mt-4">
            <OpportunityScatter data={scatterData} />
          </div>
        </AdminSurface>
      )}

      <EvidenceDataSection
        contentGap={contentGap}
        insightActions={insightActions}
        pageOpportunities={pageOpportunities}
      />

      <StrategyRulesPanel />
    </div>
  );
}
