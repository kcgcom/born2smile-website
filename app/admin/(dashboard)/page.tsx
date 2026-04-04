"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { signOutAdmin } from "@/lib/admin-auth";
import { AdminLoadingSkeleton } from "./components/AdminLoadingSkeleton";
import { AdminTabs, ADMIN_TABS, type AdminTabId } from "./components/AdminTabs";

const OverviewTab = dynamic(
  () => import("./components/DashboardTab").then((m) => m.DashboardTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const ContentTabView = dynamic(
  () => import("./components/ContentTab").then((m) => m.ContentTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const SeoTabView = dynamic(
  () => import("./components/SeoTab").then((m) => m.SeoTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const ConversionTabView = dynamic(
  () => import("./components/ConversionTab").then((m) => m.ConversionReportTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const SettingsTabView = dynamic(
  () => import("./components/AdminSettingsTab").then((m) => m.SettingsTabShell),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const DevtoolsTabView = dynamic(
  () => import("./components/DevtoolsTab").then((m) => m.DevtoolsShell),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);

const TAB_REDIRECT: Record<string, { tab: AdminTabId; sub?: string }> = {
  dev: { tab: "devtools" },
  insight: { tab: "seo", sub: "search" },
  traffic: { tab: "seo", sub: "traffic" },
  search: { tab: "seo", sub: "search" },
  trend: { tab: "seo", sub: "trend" },
  blog: { tab: "content", sub: "posts" },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const editSlug = searchParams.get("edit");
  const newCategory = searchParams.get("newCategory");

  useEffect(() => {
    if (rawTab && rawTab in TAB_REDIRECT) {
      const redirect = TAB_REDIRECT[rawTab];
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", redirect.tab);
      if (redirect.sub) params.set("sub", redirect.sub);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [pathname, rawTab, router, searchParams]);

  const validTabIds = ADMIN_TABS.map((tab) => tab.id) as string[];
  const activeTab: AdminTabId = validTabIds.includes(rawTab ?? "") ? (rawTab as AdminTabId) : "dashboard";

  const [visitedTabs, setVisitedTabs] = useState<Set<AdminTabId>>(() => new Set(["dashboard", activeTab]));
  const renderedTabs = useMemo(() => {
    if (visitedTabs.has(activeTab)) return visitedTabs;
    return new Set(visitedTabs).add(activeTab);
  }, [activeTab, visitedTabs]);

  const replaceParams = useCallback((tab: string, sub?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (sub) params.set("sub", sub);
    else params.delete("sub");
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const handleTabChange = (tab: AdminTabId) => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      return new Set(prev).add(tab);
    });
    replaceParams(tab);
  };

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f8ff_0%,#f8fafc_16%,#f8fafc_100%)]">
      <DashboardHeader onLogout={handleLogout} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AdminSurface tone="white" className="mb-4 rounded-3xl px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[var(--foreground)]">운영 콘솔</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                블로그, SEO, 전환, 설정을 한 흐름으로 관리할 수 있습니다.
              </p>
            </div>
            <AdminActionLink tone="dark" href="/admin?tab=content&sub=posts" className="shrink-0">
              <BarChart3 className="h-4 w-4" />
              콘텐츠 관리 열기
            </AdminActionLink>
          </div>
        </AdminSurface>

        <div className="mb-2">
          <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {renderedTabs.has("dashboard") && (
          <div hidden={activeTab !== "dashboard"}>
            <OverviewTab navigateTo={replaceParams} />
          </div>
        )}
        {renderedTabs.has("content") && (
          <div hidden={activeTab !== "content"}>
            <ContentTabView editSlug={editSlug} newCategory={newCategory} />
          </div>
        )}
        {renderedTabs.has("seo") && (
          <div hidden={activeTab !== "seo"}>
            <SeoTabView />
          </div>
        )}
        {renderedTabs.has("conversion") && (
          <div hidden={activeTab !== "conversion"}>
            <ConversionTabView />
          </div>
        )}
        {renderedTabs.has("settings") && (
          <div hidden={activeTab !== "settings"}>
            <SettingsTabView />
          </div>
        )}
        {renderedTabs.has("devtools") && (
          <div hidden={activeTab !== "devtools"}>
            <DevtoolsTabView />
          </div>
        )}
      </div>
    </div>
  );
}
