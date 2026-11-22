"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBrowserPresence } from "./AdminBrowserPresence";
import { useAdminAuthState } from "./AdminAuthProvider";
import { DashboardHeader } from "./DashboardHeader";
import { signOutAdmin } from "@/lib/admin-auth";

const contentLinks = [
  ["/staff/content/tasks", "작업함"],
  ["/staff/content/posts", "원고 목록"],
  ["/staff/content/review", "검토 요청"],
  ["/staff/content/schedule", "발행 일정"],
  ["/staff/content/images", "이미지"],
] as const;

export function StaffWorkspaceShell({ children }: { children: React.ReactNode }) {
  const { access } = useAdminAuthState();
  const pathname = usePathname();
  const links = [
    ...(access?.permissions.includes("content") ? contentLinks : []),
    ...(access?.permissions.includes("staff") ? [["/staff/system/settings", "병원 정보·진료시간"] as const] : []),
  ];
  return <div className="min-h-screen bg-slate-50">
    <AdminBrowserPresence />
    <DashboardHeader staff canReturnToAdmin={access?.isOwner} onLogout={async () => {
      await signOutAdmin();
      window.location.replace("/staff/login");
    }} />
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <nav aria-label="직원 업무 메뉴" className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-900">{label}</Link>)}
      </nav>
      {children}
    </div>
  </div>;
}
