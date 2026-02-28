"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOutAdmin } from "@/lib/admin-auth";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminTabs, TABS, type TabId } from "./components/AdminTabs";
import { AdminLoadingSkeleton } from "./components/AdminLoadingSkeleton";
import { preloadAdminApi } from "./components/useAdminApi";

// -------------------------------------------------------------
// 탭 레벨 코드 스플리팅 (ssr: false — 모든 탭이 "use client" + Firebase)
// -------------------------------------------------------------

const TrafficTab = dynamic(
  () => import("./components/TrafficTab").then((m) => m.TrafficTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const SearchTab = dynamic(
  () => import("./components/SearchTab").then((m) => m.SearchTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const TrendTab = dynamic(
  () => import("./components/TrendTab").then((m) => m.TrendTab),
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
  traffic: "/api/admin/analytics?period=7d",
  search: "/api/admin/search-console?period=28d",
  trend: "/api/admin/naver-datalab/overview?period=3m",
  blog: "/api/admin/blog-posts",
  settings: "/api/admin/site-config/links",
  dev: "/api/dev/env-status",
};

// -------------------------------------------------------------
// 대시보드 메인 페이지
// -------------------------------------------------------------

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const editSlug = searchParams.get("edit");
  const newCategory = searchParams.get("newCategory");
  const validTabIds = TABS.map((t) => t.id) as string[];
  const activeTab: TabId = validTabIds.includes(rawTab ?? "") ? (rawTab as TabId) : "dev";

  // 방문한 탭 추적 — unmount 방지로 상태 보존
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set(["dev"]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u));
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  const handleTabChange = (tab: TabId) => {
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
    <div className="min-h-screen bg-[var(--background)]">
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">대시보드</h2>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} onHover={handleTabHover} />
        </div>

        {/* 탭 콘텐츠 — hidden 패턴으로 방문 탭 DOM 유지 */}
        {visitedTabs.has("dev") && (
          <div hidden={activeTab !== "dev"}><DevTab /></div>
        )}
        {visitedTabs.has("traffic") && (
          <div hidden={activeTab !== "traffic"}><TrafficTab /></div>
        )}
        {visitedTabs.has("search") && (
          <div hidden={activeTab !== "search"}><SearchTab /></div>
        )}
        {visitedTabs.has("trend") && (
          <div hidden={activeTab !== "trend"}><TrendTab /></div>
        )}
        {visitedTabs.has("blog") && (
          <div hidden={activeTab !== "blog"}><BlogTab editSlug={editSlug} newCategory={newCategory} /></div>
        )}
        {visitedTabs.has("settings") && (
          <div hidden={activeTab !== "settings"}><SettingsTab /></div>
        )}
      </div>
    </div>
  );
}
