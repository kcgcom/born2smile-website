"use client";

import { MousePointerClick, Search, Target, TrendingUp } from "lucide-react";
import { AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { MetricCard } from "@/app/admin/(dashboard)/components/MetricCard";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";

interface SearchConsoleData {
  summary: {
    clicks: { value: number; change: number | null };
    impressions: { value: number; change: number | null };
    ctr: { value: number; change: number | null };
  };
}

interface ConversionData {
  configured: boolean;
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
    totalShareActions: number;
  };
}

export function GrowthOverviewPanel() {
  const { data: searchData, loading: searchLoading } = useAdminApi<SearchConsoleData>("/api/admin/search-console?period=28d");
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>("/api/admin/posthog/conversion?period=30d");

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdminPill tone="white">운영 워크스페이스</AdminPill>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">오늘 처리할 운영 우선순위를 먼저 확인합니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              개요에서는 브리핑 핵심만 보고, 상세 실행은 각 화면에서 이어갑니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminActionLink tone="dark" href="/admin/analysis/search">
              <Search className="h-4 w-4" />
              검색 성과
            </AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/operations/conversion">
              <MousePointerClick className="h-4 w-4" />
              전환
            </AdminActionLink>
          </div>
        </div>
      </AdminSurface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <MetricCard
          label="검색 클릭"
          value={searchData?.summary.clicks.value.toLocaleString("ko-KR") ?? "—"}
          change={searchData?.summary.clicks.change}
          loading={searchLoading}
        />
        <MetricCard
          label="검색 노출"
          value={searchData?.summary.impressions.value.toLocaleString("ko-KR") ?? "—"}
          change={searchData?.summary.impressions.change}
          loading={searchLoading}
        />
        <MetricCard
          label="CTR"
          value={searchData ? `${searchData.summary.ctr.value.toFixed(2)}%` : "—"}
          change={searchData?.summary.ctr.change}
          loading={searchLoading}
        />
        <MetricCard
          label="30일 CTA 클릭"
          value={conversionData?.configured ? conversionData.summary.totalCtaClicks.toLocaleString("ko-KR") : "설정 필요"}
          color="text-[var(--color-primary)]"
          loading={conversionLoading}
        />
        <MetricCard
          label="30일 전화 클릭"
          value={conversionData?.configured ? conversionData.summary.totalPhoneClicks.toLocaleString("ko-KR") : "설정 필요"}
          color="text-emerald-700"
          loading={conversionLoading}
        />
        <MetricCard
          label="30일 블로그 공유"
          value={conversionData?.configured ? conversionData.summary.totalShareActions.toLocaleString("ko-KR") : "설정 필요"}
          color="text-sky-700"
          loading={conversionLoading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSurface tone="white" className="rounded-3xl p-5">
          <Search className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">검색 성과 분석</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">상위 쿼리, CTR, 순위 변화 점검</p>
          <AdminActionLink tone="dark" href="/admin/analysis/search" className="mt-3 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-5">
          <MousePointerClick className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">전환 리포트</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">CTA·전화·공유 전환 상세 분석</p>
          <AdminActionLink tone="dark" href="/admin/operations/conversion" className="mt-3 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-5">
          <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">검색 트렌드</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">검색 수요 변화와 키워드 동향</p>
          <AdminActionLink tone="dark" href="/admin/content/trends" className="mt-3 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-5">
          <Target className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">콘텐츠 전략</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">실행 우선순위와 브리프 정리</p>
          <AdminActionLink tone="dark" href="/admin/content/strategy" className="mt-3 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>
      </div>
    </div>
  );
}
