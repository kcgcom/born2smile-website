"use client";

import { Bot, MousePointerClick, Search, TrendingUp } from "lucide-react";
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
  };
}

interface SuggestionData {
  items: Array<{ status: string }>;
}

export function GrowthOverviewPanel() {
  const { data: searchData, loading: searchLoading } = useAdminApi<SearchConsoleData>("/api/admin/search-console?period=28d");
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>("/api/admin/posthog/conversion?period=7d");
  const { data: suggestionData, loading: suggestionLoading } = useAdminApi<SuggestionData>("/api/admin/ai-ops/suggestions?limit=20");

  const pendingSuggestions = suggestionData?.items.filter((item) => item.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdminPill tone="white">성장 워크스페이스</AdminPill>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">유입과 전환, 개선 제안을 한 화면에서 요약합니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              상세 분석은 각 화면으로 들어가고, 여기서는 지금 확인할 성장 신호만 빠르게 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminActionLink tone="dark" href="/admin/growth/search">
              <Search className="h-4 w-4" />
              검색 성과
            </AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/growth/conversion">
              <MousePointerClick className="h-4 w-4" />
              전환
            </AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/growth/ai-ops">
              <Bot className="h-4 w-4" />
              AI 운영실
            </AdminActionLink>
          </div>
        </div>
      </AdminSurface>

      <div className="grid grid-cols-2 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 xl:grid-cols-5 xl:[&>*:last-child]:col-span-1">
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
          label="CTA 클릭"
          value={conversionData?.configured ? conversionData.summary.totalCtaClicks.toLocaleString("ko-KR") : "설정 필요"}
          color="text-[var(--color-primary)]"
          loading={conversionLoading}
        />
        <MetricCard
          label="승인 대기 제안"
          value={suggestionLoading ? "—" : `${pendingSuggestions}건`}
          color="text-emerald-700"
          loading={suggestionLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--foreground)]">검색 성과</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Search Console 기반 상위 쿼리, CTR, 순위 변화를 점검합니다.
          </p>
          <AdminActionLink tone="dark" href="/admin/growth/search" className="mt-4 w-full">
            상세 보기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--foreground)]">트렌드와 전략</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            트렌드 변화와 콘텐츠 전략 후보를 나눠서 확인합니다.
          </p>
          <div className="mt-4 flex gap-2">
            <AdminActionLink tone="dark" href="/admin/growth/trends" className="flex-1">
              트렌드
            </AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/growth/strategy" className="flex-1">
              전략
            </AdminActionLink>
          </div>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--foreground)]">AI 운영실</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            운영 브리핑, 개선 제안, 승인 대기함과 활동 로그를 관리합니다.
          </p>
          <AdminActionLink tone="dark" href="/admin/growth/ai-ops" className="mt-4 w-full">
            작업 열기
          </AdminActionLink>
        </AdminSurface>
      </div>
    </div>
  );
}
