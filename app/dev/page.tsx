"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ExternalLink, Settings } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOutAdmin } from "@/lib/admin-auth";
import { CLINIC } from "@/lib/constants";
import { AuthGuard } from "@/components/admin/AuthGuard";
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
      {/* 헤더 */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-lg font-bold text-[var(--foreground)] transition-colors hover:text-[var(--color-primary)]"
              title="사이트로 이동"
            >
              {CLINIC.name}
              <ExternalLink size={14} className="text-[var(--muted)]" aria-hidden="true" />
            </Link>
            <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
              개발
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              <Settings size={14} aria-hidden="true" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

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
