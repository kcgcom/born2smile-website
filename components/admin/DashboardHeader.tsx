"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { MobileMenuButton, MobileMenuPanel, useMobileNavigation } from "@/components/layout/MobileNavigation";
import { CLINIC } from "@/lib/constants";

// -------------------------------------------------------------
// 관리자 대시보드 헤더
// -------------------------------------------------------------

interface DashboardHeaderProps {
  onLogout: () => void;
  staff?: boolean;
  canReturnToAdmin?: boolean;
}

export function DashboardHeader({ onLogout, staff, canReturnToAdmin }: DashboardHeaderProps) {
  const pathname = usePathname();
  const mobileMenu = useMobileNavigation();
  const WorkspaceIcon = staff ? LayoutDashboard : UsersRound;
  const workspaceLabel = staff ? "원장 관리로 돌아가기" : "직원 화면 열기";
  return (
    <AdminSurface
      tone="dark"
      className="relative z-50 border-x-0 border-t-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]"
    >
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 sm:py-4 md:gap-4 lg:py-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80">
              <Image
                src="/images/Logo_SNU.png"
                alt="서울대학교 엠블럼"
                width={40}
                height={40}
                className="h-8 w-8 shrink-0 brightness-0 invert md:h-10 md:w-10"
              />
              <span className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">{CLINIC.name}</span>
            </Link>
            <span lang="en" className="shrink-0 font-serif text-lg font-medium italic tracking-wide text-amber-200 sm:text-xl">
              {staff ? "Staff" : "Admin"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:justify-end">
          {(!staff || canReturnToAdmin) && (
            <Link
              href={staff ? "/admin" : "/staff"}
              aria-label={workspaceLabel}
              title={workspaceLabel}
              className="hidden size-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
            >
              <WorkspaceIcon size={20} aria-hidden="true" />
            </Link>
          )}
          <div className="lg:hidden">
            <MobileMenuButton menu={mobileMenu} />
          </div>
          <details
            className="relative hidden lg:block"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !event.currentTarget.open) return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}
          >
            <summary aria-label="계정 메뉴" className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-white/6 text-white hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
              <CircleUserRound size={20} aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <AdminActionButton
                onClick={onLogout}
                data-confirm-navigation
                tone="dark"
                className="min-h-11 w-full justify-start rounded-lg px-3"
              >
                <LogOut size={16} aria-hidden="true" />
                로그아웃
              </AdminActionButton>
            </div>
          </details>
        </div>
      </header>
      <MobileMenuPanel menu={mobileMenu} pathname={pathname} className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] shadow-sm">
        <AdminActionButton
          onClick={onLogout}
          data-confirm-navigation
          tone="dark"
          className="mt-4 min-h-11 w-full justify-center rounded-full px-5 py-3 text-base"
        >
          <LogOut size={18} aria-hidden="true" />
          로그아웃
        </AdminActionButton>
        {(!staff || canReturnToAdmin) && (
          <Link
            href={staff ? "/admin" : "/staff"}
            aria-label={workspaceLabel}
            onClick={() => mobileMenu.setOpen(false)}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-base font-medium text-[var(--foreground)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <WorkspaceIcon size={18} aria-hidden="true" />
            {staff ? "Admin" : "Staff"}
          </Link>
        )}
      </MobileMenuPanel>
    </AdminSurface>
  );
}
