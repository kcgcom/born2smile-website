"use client";

import { MousePointerClick, Search, Target, TrendingUp } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import type { IndexingMonitorData } from "@/lib/admin-indexing-monitor";
import { MetricCard } from "./MetricCard";
import { DataFreshness } from "./DataFreshness";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi } from "./useAdminApi";
import type { SearchConsoleData } from "./search/search-types";
import type { AdminBlogPost } from "./blog/blog-helpers";

interface ConversionData {
  configured: boolean;
  meta: { fetchedAt: string };
  summary: { totalCtaClicks: number; totalPhoneClicks: number; totalContactClicks?: number; totalShareActions: number };
}

const LINKS = [
  { title: "검색 성과 분석", description: "상위 키워드, CTR, 순위 변화 점검", href: "/admin/analysis/search", icon: Search },
  { title: "전환 리포트", description: "CTA·전화·공유 성과 분석", href: "/admin/operations/conversion", icon: MousePointerClick },
  { title: "검색 트렌드", description: "검색 수요 변화와 키워드 동향", href: "/admin/content/trends", icon: TrendingUp },
  { title: "기회 분석", description: "실행 우선순위와 브리프 정리", href: "/admin/content/strategy", icon: Target },
];

export function GrowthOverviewPanel() {
  const search = useAdminApi<SearchConsoleData>("/api/admin/search-console?period=28d");
  const conversion = useAdminApi<ConversionData>("/api/admin/posthog/conversion?period=30d");
  const indexing = useAdminApi<IndexingMonitorData>("/api/admin/indexing-status");
  const posts = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const drafts = posts.data?.filter(post => !post.published).length ?? 0;
  const searchData = search.data;
  const conversionData = conversion.data;

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900">오늘 확인할 운영 항목</h1>
        <p className="mt-2 text-sm text-slate-600">확인이 필요한 항목부터 살펴보고 각 화면에서 처리하세요. 색인 확인 필요는 검토 대상이며 모두 오류를 뜻하지는 않습니다.</p>
        <ul className="mt-4 space-y-3">
          <li className="rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">색인 상태</h2>
            <p className="mt-1 text-sm text-slate-700">{indexing.loading ? "색인 상태 확인 중…" : indexing.error ? "색인 상태를 불러오지 못했습니다." : indexing.data ? `확인 필요 ${indexing.data.summary.needsAttention}개 · 검사 실패 ${indexing.data.summary.failed}개 · 상태 변경 확인 중 ${indexing.data.summary.pendingChanges}개` : "색인 상태를 확인할 수 없습니다."}</p>
            <AdminActionLink tone="dark" href="/admin/analysis/indexing" className="mt-3">색인 대상 검토하기</AdminActionLink>
          </li>
          <li className="rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">발행 전 초안</h2>
            <p className="mt-1 text-sm text-slate-700">{posts.loading ? "초안 확인 중…" : posts.error ? "초안을 불러오지 못했습니다." : posts.data ? `미발행 초안 ${drafts}건 · 내용과 발행 일정을 검토하세요.` : "초안을 확인할 수 없습니다."}</p>
            <AdminActionLink tone="dark" href="/admin/content/posts?status=draft" className="mt-3">초안 검토하기</AdminActionLink>
          </li>
        </ul>
        {indexing.error && <AdminErrorState message={indexing.error} onRetry={indexing.refetch} />}
        {posts.error && <AdminErrorState message={posts.error} onRetry={posts.refetch} />}
      </AdminSurface>

      <section aria-labelledby="overview-search" className="space-y-3">
        <h2 id="overview-search" className="text-base font-bold text-slate-900">검색 성과 · Search Console · 28일</h2>
        <DataFreshness dataAsOf={searchData?.dataAsOf} period={searchData?.period} comparePeriod={searchData?.comparePeriod} updatedAt={search.updatedAt} isValidating={search.isValidating} expectedDelayDays={3} onRefresh={search.refetch} />
        {search.error && <AdminErrorState message={search.error} onRetry={search.refetch} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="28일 검색 클릭" value={searchData?.summary.clicks.value.toLocaleString("ko-KR") ?? "—"} change={searchData?.summary.clicks.change} loading={search.loading} />
          <MetricCard label="28일 검색 노출" value={searchData?.summary.impressions.value.toLocaleString("ko-KR") ?? "—"} change={searchData?.summary.impressions.change} loading={search.loading} />
          <MetricCard label="28일 CTR" value={searchData ? `${searchData.summary.ctr.value}%` : "—"} change={searchData?.summary.ctr.change} loading={search.loading} />
        </div>
      </section>

      <section aria-labelledby="overview-conversion" className="space-y-3">
        <h2 id="overview-conversion" className="text-base font-bold text-slate-900">전환 성과 · PostHog · 최근 30일</h2>
        <p className="text-sm text-slate-600">{conversionData?.meta?.fetchedAt ? `조회 시각: ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(conversionData.meta.fetchedAt))} KST` : "조회 시각 확인 중"} · 검색 성과와 집계 기간이 다릅니다.</p>
        {conversion.error && <AdminErrorState message={conversion.error} onRetry={conversion.refetch} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="30일 전화·카카오 클릭" value={conversionData?.configured ? (conversionData.summary.totalPhoneClicks + (conversionData.summary.totalContactClicks ?? 0)).toLocaleString("ko-KR") : conversionData ? "설정 필요" : "—"} loading={conversion.loading} />
          <MetricCard label="30일 전화 클릭" value={conversionData?.configured ? conversionData.summary.totalPhoneClicks.toLocaleString("ko-KR") : conversionData ? "설정 필요" : "—"} loading={conversion.loading} />
          <MetricCard label="30일 공유 시도" value={conversionData?.configured ? conversionData.summary.totalShareActions.toLocaleString("ko-KR") : conversionData ? "설정 필요" : "—"} loading={conversion.loading} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LINKS.map(({ title, description, href, icon: Icon }) => <AdminSurface key={href} tone="white" className="rounded-2xl p-5">
          <Icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <h2 className="mt-2 text-sm font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          <AdminActionLink tone="dark" href={href} className="mt-3 w-full">{title} 열기</AdminActionLink>
        </AdminSurface>)}
      </div>
    </div>
  );
}
