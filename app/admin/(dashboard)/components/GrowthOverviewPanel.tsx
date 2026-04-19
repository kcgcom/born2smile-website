"use client";

import { Bot, MousePointerClick, Search, TrendingUp } from "lucide-react";
import { AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { MetricCard } from "@/app/admin/(dashboard)/components/MetricCard";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import type { AiOpsBriefing, AiOpsSuggestionListItem } from "@/lib/admin-ai-ops-types";

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

export function GrowthOverviewPanel() {
  const { data: searchData, loading: searchLoading } = useAdminApi<SearchConsoleData>("/api/admin/search-console?period=28d");
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>("/api/admin/posthog/conversion?period=7d");
  const { data: suggestionData, loading: suggestionLoading } = useAdminApi<AiOpsSuggestionListItem[]>("/api/admin/ai-ops/suggestions?limit=20");
  const { data: briefingData, loading: briefingLoading } = useAdminApi<AiOpsBriefing>("/api/admin/ai-ops/briefing?period=30d");

  const pendingSuggestions = suggestionData?.filter((item) => item.status === "draft").length ?? 0;
  const todayTasks = briefingData?.todayTasks.slice(0, 3) ?? [];

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
            <AdminActionLink tone="dark" href="/admin/operations/ai-ops">
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

      <AdminSurface tone="success" className="rounded-3xl px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="sky">운영 브리핑 요약</AdminPill>
            <h3 className="mt-3 text-2xl font-bold">
              {briefingLoading ? "운영 브리핑을 불러오는 중입니다." : (briefingData?.headline ?? "운영 브리핑이 준비되지 않았습니다.")}
            </h3>
            <p className="mt-2 text-sm text-emerald-50/90">
              {briefingLoading ? "AI 운영실 브리핑을 동기화하고 있습니다." : (briefingData?.summary ?? "브리핑 데이터를 확인한 뒤 오늘의 운영 작업을 정리하세요.")}
            </p>
          </div>
          <AdminActionLink tone="ghost" href="/admin/operations/ai-ops/briefing">
            브리핑 상세 보기
          </AdminActionLink>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {todayTasks.length > 0 ? todayTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-emerald-50">
              <div className="text-sm font-semibold">{task.title}</div>
              <div className="mt-1 text-xs text-emerald-50/80">{task.description}</div>
            </div>
          )) : (
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-sm text-emerald-50/80 md:col-span-3">
              오늘 우선 작업은 AI 운영실 브리핑 상세 화면에서 확인할 수 있습니다.
            </div>
          )}
        </div>
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--foreground)]">검색 성과</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Search Console 기반 상위 쿼리, CTR, 순위 변화를 점검합니다.
          </p>
          <AdminActionLink tone="dark" href="/admin/analysis/search" className="mt-4 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-bold text-[var(--foreground)]">트렌드와 실행</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            트렌드 변화는 여기서 보고, 콘텐츠 전략 정리는 콘텐츠 워크스페이스에서 이어집니다.
          </p>
          <div className="mt-4 flex gap-2">
            <AdminActionLink tone="dark" href="/admin/content/trends" className="flex-1">
              열기
            </AdminActionLink>
            <AdminActionLink tone="dark" href="/admin/content/strategy" className="flex-1">
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
            브리핑, 실행, 검토, 관측 흐름을 한곳에서 관리합니다.
          </p>
          <AdminActionLink tone="dark" href="/admin/operations/ai-ops" className="mt-4 w-full">
            열기
          </AdminActionLink>
        </AdminSurface>
      </div>
    </div>
  );
}
