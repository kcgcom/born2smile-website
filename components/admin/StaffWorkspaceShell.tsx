"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBrowserPresence } from "./AdminBrowserPresence";
import { useAdminAuthState } from "./AdminAuthProvider";
import { DashboardHeader } from "./DashboardHeader";
import { signOutAdmin } from "@/lib/admin-auth";
import { AdminSurface } from "./AdminChrome";
import { STAFF_HOME } from "@/lib/admin-access";

const STAFF_SECTIONS = [
  {
    label: "콘텐츠",
    tabs: [
      { href: STAFF_HOME, label: "작업함" },
      { href: "/staff/content/posts", label: "원고 목록" },
      { href: "/staff/content/review", label: "검토 요청", alias: "/staff/content/revisions" },
      { href: "/staff/content/schedule", label: "발행 일정" },
      { href: "/staff/content/images", label: "이미지" },
    ],
  },
  {
    label: "행정",
    tabs: [{ href: "/staff/system/settings", label: "병원 정보·진료시간" }],
  },
] as const;

const LINK_CLASS = "inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 aria-[current]:bg-blue-50 aria-[current]:text-blue-900";

function isCurrentTab(pathname: string, { href, alias }: { href: string; alias?: string }) {
  return pathname === href || pathname.startsWith(`${href}/`) || Boolean(alias && pathname.startsWith(`${alias}/`));
}

export function StaffWorkspaceShell({ children }: { children: React.ReactNode }) {
  const { access } = useAdminAuthState();
  const pathname = usePathname();
  const activeSection = STAFF_SECTIONS.find(({ tabs }) => tabs.some((tab) => isCurrentTab(pathname, tab)));

  return <div className="min-h-screen bg-slate-50">
    <AdminBrowserPresence />
    <DashboardHeader staff canReturnToAdmin={access?.isOwner} onLogout={async () => {
      await signOutAdmin();
      window.location.replace("/staff/login");
    }} />
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <AdminSurface tone="white" className="mb-5 flex flex-col gap-2 p-2 lg:flex-row lg:items-center">
        <nav aria-label="직원 업무 메뉴" className="flex gap-1 rounded-xl bg-slate-100 p-1 lg:shrink-0">
          {STAFF_SECTIONS.map((section) => (
            <Link key={section.label} href={section.tabs[0].href}
              aria-current={section === activeSection ? "true" : undefined}
              className={`${LINK_CLASS} flex-1 lg:flex-none`}>
              {section.label}
            </Link>
          ))}
        </nav>
        {activeSection && (
          <nav aria-label={`${activeSection.label} 세부 화면`} className="flex flex-wrap gap-1">
            {activeSection.tabs.map((tab) => (
              <Link key={tab.href} href={tab.href}
                aria-current={isCurrentTab(pathname, tab) ? "page" : undefined}
                className={LINK_CLASS}>
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </AdminSurface>
      {children}
    </div>
  </div>;
}
