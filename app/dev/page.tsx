"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOutAdmin } from "@/lib/admin-auth";
import { AuthGuard } from "@/components/admin/AuthGuard";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { DevTabs, type DevTabId, DEV_TABS } from "./components/DevTabs";
import { ProjectTab } from "./components/ProjectTab";
import { CodeQualityTab } from "./components/CodeQualityTab";
import { BuildTab } from "./components/BuildTab";
import { InfraTab } from "./components/InfraTab";

// -------------------------------------------------------------
// 개발 대시보드 메인 페이지
// -------------------------------------------------------------

function DevDashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const validTabIds = DEV_TABS.map((t) => t.id) as string[];
  const activeTab: DevTabId = validTabIds.includes(rawTab ?? "")
    ? (rawTab as DevTabId)
    : "project";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u));
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  const handleTabChange = (tab: DevTabId) => {
    router.replace(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <DashboardHeader variant="dev" userEmail={user?.email} onLogout={handleLogout} />

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
          개발 대시보드
        </h2>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <DevTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "project" && <ProjectTab />}
        {activeTab === "quality" && <CodeQualityTab />}
        {activeTab === "build" && <BuildTab />}
        {activeTab === "infra" && <InfraTab />}
      </div>
    </div>
  );
}

export default function DevDashboardPage() {
  return (
    <AuthGuard>
      <DevDashboardContent />
    </AuthGuard>
  );
}
