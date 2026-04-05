"use client";

import { CalendarClock, FilePenLine, Search, Settings2, Wrench } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { MetricCard } from "@/app/admin/(dashboard)/components/MetricCard";
import { useAdminApi } from "@/app/admin/(dashboard)/components/useAdminApi";
import { getTodayKST } from "@/lib/date";

interface AnalyticsData {
  summary: {
    sessions: { value: number; change: number | null };
  };
}

interface SearchConsoleData {
  summary: {
    clicks: { value: number; change: number | null };
    impressions: { value: number; change: number | null };
  };
  topPages: Array<{ impressions: number; ctr: number }>;
  blogPages: Array<{ impressions: number; ctr: number; position: number }>;
}

interface AdminBlogPost {
  slug: string;
  title: string;
  published: boolean;
  date: string;
}

interface ConversionData {
  configured: boolean;
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
  };
}

interface SiteLinks {
  kakaoChannel: string;
  instagram: string;
  naverBlog: string;
  naverMap: string;
  kakaoMap: string;
}

export function DashboardTab({
  navigateTo,
}: {
  navigateTo: (tab: string, sub?: string) => void;
}) {
  const today = getTodayKST();
  const { data: analyticsData, loading: analyticsLoading } = useAdminApi<AnalyticsData>("/api/admin/analytics?period=7d");
  const { data: searchData, loading: searchLoading } = useAdminApi<SearchConsoleData>("/api/admin/search-console?period=28d");
  const { data: postsData, loading: postsLoading } = useAdminApi<AdminBlogPost[]>("/api/admin/blog-posts");
  const { data: conversionData, loading: conversionLoading } = useAdminApi<ConversionData>("/api/admin/posthog/conversion?period=7d");
  const { data: linksData, loading: linksLoading } = useAdminApi<SiteLinks>("/api/admin/site-config/links");

  const posts = postsData ?? [];
  const blogStats = posts.reduce(
    (acc, post) => {
      acc.total += 1;
      if (!post.published) acc.draft += 1;
      else if (post.date > today) acc.scheduled += 1;
      else acc.published += 1;
      return acc;
    },
    { total: 0, published: 0, scheduled: 0, draft: 0 },
  );

  const missingLinks = linksData
    ? Object.values(linksData).filter((value) => !value).length
    : 0;

  const rewriteCandidates = (searchData?.blogPages ?? []).filter(
    (row) => row.impressions >= 60 && (row.ctr < 2.5 || row.position > 8),
  ).length;
  const metaCandidates = (searchData?.topPages ?? []).filter(
    (row) => row.impressions >= 80 && row.ctr < 2.5,
  ).length;

  const actionItems = [
    blogStats.scheduled > 0
      ? {
          key: "scheduled",
          icon: CalendarClock,
          title: `예약 발행 ${blogStats.scheduled}건 점검`,
          description: "이번 주에 공개될 포스트의 제목, 날짜, 최종 문안을 확인하세요.",
          tab: "content",
          sub: "schedule",
        }
      : null,
    blogStats.draft > 0
      ? {
          key: "draft",
          icon: FilePenLine,
          title: `초안 ${blogStats.draft}건 정리`,
          description: "초안 중 우선 발행할 글을 고르고 예약 발행까지 이어가세요.",
          tab: "content",
          sub: "posts",
        }
      : null,
    metaCandidates > 0 || rewriteCandidates > 0
      ? {
          key: "seo",
          icon: Search,
          title: `검색 개선 후보 ${metaCandidates + rewriteCandidates}건`,
          description: "CTR이 낮거나 순위 상승 여지가 있는 페이지를 먼저 보강하세요.",
          tab: "seo",
          sub: "search",
        }
      : null,
    missingLinks > 0
      ? {
          key: "links",
          icon: Settings2,
          title: `외부 채널 링크 ${missingLinks}건 미설정`,
          description: "카카오톡, 인스타그램, 지도 링크를 채워 전환 동선을 완성하세요.",
          tab: "settings",
        }
      : null,
    conversionData && !conversionData.configured
      ? {
          key: "conversion",
          icon: Wrench,
          title: "전환 리포트 설정 필요",
          description: "PostHog 설정을 마치면 CTA/전화 전환 성과를 바로 볼 수 있습니다.",
          tab: "conversion",
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof CalendarClock;
    title: string;
    description: string;
    tab: string;
    sub?: string;
  }>;

  return (
    <div className="space-y-6">
      <AdminSurface tone="success" className="rounded-3xl px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdminPill tone="sky">운영 중심 콘솔</AdminPill>
            <h2 className="mt-3 text-2xl font-bold">오늘 확인할 운영 우선순위</h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              블로그, 전환, 설정 작업을 한 흐름으로 빠르게 점검하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminActionButton tone="ghost" onClick={() => navigateTo("content", "schedule")}>예약 발행 보기</AdminActionButton>
            <AdminActionLink tone="ghost" href="/admin?tab=content&sub=posts">콘텐츠 관리 열기</AdminActionLink>
          </div>
        </div>
      </AdminSurface>

      <div className="grid grid-cols-2 gap-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 lg:grid-cols-5 lg:[&>*:last-child]:col-span-1">
        <MetricCard
          label="주간 세션"
          value={analyticsData?.summary.sessions.value.toLocaleString("ko-KR") ?? "—"}
          change={analyticsData?.summary.sessions.change}
          loading={analyticsLoading}
        />
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
          label="총 CTA 클릭"
          value={conversionData?.configured ? conversionData.summary.totalCtaClicks.toLocaleString("ko-KR") : "설정 필요"}
          color="text-[var(--color-primary)]"
          loading={conversionLoading}
        />
        <MetricCard
          label="전화 클릭"
          value={conversionData?.configured ? conversionData.summary.totalPhoneClicks.toLocaleString("ko-KR") : "설정 필요"}
          color="text-emerald-700"
          loading={conversionLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">지금 할 일</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">오늘 바로 처리할 운영 작업을 액션 중심으로 모았습니다.</p>
            </div>
            <AdminPill tone="white">{actionItems.length}개 항목</AdminPill>
          </div>

          {actionItems.length > 0 ? (
            <div className="space-y-3">
              {actionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => navigateTo(item.tab, item.sub)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-white"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--color-primary)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--foreground)]">{item.title}</span>
                      <span className="mt-1 block text-sm text-[var(--muted)]">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
              지금 기준으로 급한 운영 항목은 많지 않습니다. 콘텐츠 성과와 전환 추이를 확인하면서 다음 발행 계획을 잡으면 됩니다.
            </div>
          )}
        </AdminSurface>

        <div className="space-y-6">
          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">콘텐츠 현황</h3>
              <AdminPill tone="white">{blogStats.total}개 포스트</AdminPill>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="초안" value={blogStats.draft} tone="amber" loading={postsLoading} />
              <MiniStat label="예약" value={blogStats.scheduled} tone="sky" loading={postsLoading} />
              <MiniStat label="발행" value={blogStats.published} tone="slate" loading={postsLoading} />
            </div>
            <div className="mt-4 flex gap-2">
              <AdminActionButton tone="dark" onClick={() => navigateTo("content", "posts")} className="flex-1">포스트 관리</AdminActionButton>
              <AdminActionButton tone="dark" onClick={() => navigateTo("content", "schedule")} className="flex-1">발행 일정</AdminActionButton>
            </div>
          </AdminSurface>

          <AdminSurface tone="white" className="rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">설정 완성도</h3>
              <AdminPill tone="white">외부 채널</AdminPill>
            </div>
            <p className="text-sm text-[var(--muted)]">
              외부 링크 미설정 {linksLoading ? "확인 중" : `${missingLinks}건`} · 설정이 완료되면 푸터와 상담 동선에서 바로 반영됩니다.
            </p>
            <div className="mt-4 flex gap-2">
              <AdminActionButton tone="dark" onClick={() => navigateTo("settings")} className="flex-1">사이트 설정</AdminActionButton>
              <AdminActionLink tone="dark" href="/admin?tab=conversion" className="flex-1">전환 리포트</AdminActionLink>
            </div>
          </AdminSurface>

        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "slate";
  loading: boolean;
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-2xl px-4 py-3 text-center ${toneClass}`}>
      <div className="text-xl font-bold">{loading ? "—" : value.toLocaleString("ko-KR")}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}
