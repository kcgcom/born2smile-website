"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { AuthSession } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signOutAdmin } from "@/lib/admin-auth";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminTabs, TABS, type TabId } from "./components/AdminTabs";
import { AdminLoadingSkeleton } from "./components/AdminLoadingSkeleton";
import { preloadAdminApi } from "./components/useAdminApi";

// -------------------------------------------------------------
// 기본 탭(dev) 청크를 auth 검증과 병렬로 프리로드
// dynamic() lazy import와 달리 이 import()는 auth 전에 즉시 시작됨
// -------------------------------------------------------------

void import("./components/DevTab");

// -------------------------------------------------------------
// 구탭 → 신탭 리다이렉트 매핑 (북마크 호환)
// -------------------------------------------------------------

const TAB_REDIRECT: Record<string, { tab: string; sub?: string }> = {
  traffic: { tab: "insight", sub: "traffic" },
  search: { tab: "insight", sub: "search" },
  trend: { tab: "insight", sub: "trend" },
};

// -------------------------------------------------------------
// 탭 레벨 코드 스플리팅 (ssr: false — 모든 탭이 "use client")
// -------------------------------------------------------------

const InsightTab = dynamic(
  () => import("./components/InsightTab").then((m) => m.InsightTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const BlogTab = dynamic(
  () => import("./components/BlogTab").then((m) => m.BlogTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const SettingsTab = dynamic(
  () => import("./components/SettingsTab").then((m) => m.SettingsTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const DevTab = dynamic(
  () => import("./components/DevTab").then((m) => m.DevTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);

// -------------------------------------------------------------
// 호버 프리페치 — 탭별 주요 엔드포인트
// -------------------------------------------------------------

const TAB_PREFETCH_ENDPOINTS: Partial<Record<TabId, string>> = {
  insight: "/api/admin/analytics?period=7d",
  blog: "/api/admin/blog-posts",
  settings: "/api/admin/site-config/links",
  dev: "/api/dev/env-status",
};

// -------------------------------------------------------------
// 대시보드 메인 페이지
// -------------------------------------------------------------

export default function AdminDashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const editSlug = searchParams.get("edit");
  const newCategory = searchParams.get("newCategory");

  // 구탭 리다이렉트
  useEffect(() => {
    if (rawTab && rawTab in TAB_REDIRECT) {
      const redirect = TAB_REDIRECT[rawTab];
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", redirect.tab);
      if (redirect.sub) params.set("sub", redirect.sub);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [rawTab, pathname, router, searchParams]);

  const validTabIds = TABS.map((t) => t.id) as string[];
  const activeTab: TabId = validTabIds.includes(rawTab ?? "") ? (rawTab as TabId) : "dev";

  // 방문한 탭 추적 — unmount 방지로 상태 보존
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    () => new Set(["dev", activeTab]),
  );
  const renderedTabs = useMemo(() => {
    if (visitedTabs.has(activeTab)) return visitedTabs;
    return new Set(visitedTabs).add(activeTab);
  }, [activeTab, visitedTabs]);

  useEffect(() => {
    // 이메일 표시용 단순 조회 — AuthGuard가 세션 변경/리다이렉트를 처리하므로 구독 불필요
    void getSupabaseBrowserClient().auth.getSession().then(
      ({ data: { session } }: { data: { session: AuthSession | null } }) => {
        if (session?.user) setUser({ email: session.user.email ?? undefined });
      },
    );
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/");
  };

  const handleTabChange = (tab: TabId) => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set(prev).add(tab);
    });
    router.replace(`${pathname}?tab=${tab}`);
  };

  // 호버 프리페치 — 미방문 탭만 프리페치
  const handleTabHover = useCallback(
    (tab: TabId) => {
      if (visitedTabs.has(tab)) return;
      const endpoint = TAB_PREFETCH_ENDPOINTS[tab];
      if (endpoint) preloadAdminApi(endpoint);
    },
    [visitedTabs],
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f8fafc_16%,#f8fafc_100%)]">
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* 탭 네비게이션 */}
        <div className="mb-2">
          <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} onHover={handleTabHover} />
        </div>

        {/* 탭 콘텐츠 — hidden 패턴으로 방문 탭 DOM 유지 */}
        {renderedTabs.has("dev") && (
          <div hidden={activeTab !== "dev"}><DevTab /></div>
        )}
        {renderedTabs.has("insight") && (
          <div hidden={activeTab !== "insight"}><InsightTab /></div>
        )}
        {renderedTabs.has("blog") && (
          <div hidden={activeTab !== "blog"}><BlogTab editSlug={editSlug} newCategory={newCategory} /></div>
        )}
        {renderedTabs.has("settings") && (
          <div hidden={activeTab !== "settings"}><SettingsTab /></div>
        )}
      </div>
    </div>
  );
}
