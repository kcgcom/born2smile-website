"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBrowserPresence } from "./AdminBrowserPresence";
import { useAdminAuthState } from "./AdminAuthProvider";
import { DashboardHeader } from "./DashboardHeader";
import { AdminSurface } from "./AdminChrome";
import { STAFF_HOME } from "@/lib/admin-access";

const STAFF_NAV = [
  { href: STAFF_HOME, label: "홈" },
  { href: "/staff/system/first-visit", label: "내원안내" },
  { href: "/staff/content/posts", label: "블로그 공유" },
] as const;

export function StaffWorkspaceShell({ children }: { children: React.ReactNode }) {
  const { access } = useAdminAuthState();
  const pathname = usePathname();

  return <div className="min-h-screen bg-slate-50">
    <AdminBrowserPresence />
    <DashboardHeader staff canReturnToAdmin={access?.isOwner} />
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
      <AdminSurface tone="white" className="mb-5 p-2">
        <nav aria-label="직원 업무 메뉴" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:flex sm:w-fit">
          {STAFF_NAV.map(({ href, label }) => {
            const current = pathname === href ? "page" : pathname.startsWith(`${href}/`) ? "location" : undefined;
            return (
              <Link key={href} href={href} aria-current={current}
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-1 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200/70 focus-visible:outline-2 focus-visible:outline-blue-700 aria-[current]:bg-white aria-[current]:text-blue-900 sm:px-4">
                {label}
              </Link>
            );
          })}
        </nav>
      </AdminSurface>
      {children}
    </div>
  </div>;
}
