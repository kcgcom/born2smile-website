"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOutAdmin } from "@/lib/admin-auth";
import { CLINIC } from "@/lib/constants";
import { AdminTabs, TABS, type TabId } from "./components/AdminTabs";
import { OverviewTab } from "./components/OverviewTab";
import { TrafficTab } from "./components/TrafficTab";
import { SearchTab } from "./components/SearchTab";
import { BlogTab } from "./components/BlogTab";
import { SettingsTab } from "./components/SettingsTab";

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
  const validTabIds = TABS.map((t) => t.id) as string[];
  const activeTab: TabId = validTabIds.includes(rawTab ?? "") ? (rawTab as TabId) : "overview";

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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {CLINIC.name}
            </h1>
            <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white">
              관리자
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-gray-50 hover:text-[var(--foreground)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">대시보드</h2>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "traffic" && <TrafficTab />}
        {activeTab === "search" && <SearchTab />}
        {activeTab === "blog" && <BlogTab editSlug={editSlug} />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
