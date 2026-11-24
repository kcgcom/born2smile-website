"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LogOut } from "lucide-react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { MobileMenuButton, MobileMenuPanel, useMobileNavigation } from "@/components/layout/MobileNavigation";
import { CLINIC } from "@/lib/constants";
import styles from "./DashboardHeader.module.css";

// -------------------------------------------------------------
// 관리자 대시보드 헤더
// -------------------------------------------------------------

interface DashboardHeaderProps {
  onLogout: () => void;
  staff?: boolean;
  canReturnToAdmin?: boolean;
}

const WORKSPACE_LINK_CLASS = "inline-flex min-h-11 w-14 items-center justify-center rounded-lg text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 sm:w-20 sm:text-lg";
const ACTIVE_WORKSPACE_CLASS = `${styles.activeWorkspace} text-amber-200`;
const INACTIVE_WORKSPACE_CLASS = "text-slate-300 hover:bg-white/8 hover:text-white motion-safe:transition-colors motion-safe:duration-150";

export function DashboardHeader({ onLogout, staff, canReturnToAdmin }: DashboardHeaderProps) {
  const pathname = usePathname();
  const mobileMenu = useMobileNavigation();
  return (
    <AdminSurface
      tone="dark"
      className="relative z-50 border-x-0 border-t-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]"
    >
      <header data-workspace-header className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-4 md:gap-4 lg:py-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link href="/" className="flex min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80 sm:gap-2">
              <Image
                src="/images/Logo_SNU.png"
                alt="서울대학교 엠블럼"
                width={40}
                height={40}
                className="size-7 shrink-0 brightness-0 invert sm:size-8 md:size-10"
              />
              <span className="truncate text-lg font-bold tracking-tight text-white max-[359px]:text-base sm:text-2xl">{CLINIC.name}</span>
            </Link>
            <nav aria-label="업무 화면 전환" className="flex shrink-0 items-center gap-1 whitespace-nowrap">
              {(!staff || canReturnToAdmin) && (
                <Link href="/admin" lang="en" aria-current={!staff ? "location" : undefined} className={`${WORKSPACE_LINK_CLASS} ${staff ? INACTIVE_WORKSPACE_CLASS : ACTIVE_WORKSPACE_CLASS}`}>
                  Admin
                </Link>
              )}
              <Link href="/staff" lang="en" aria-current={staff ? "location" : undefined} className={`${WORKSPACE_LINK_CLASS} ${staff ? ACTIVE_WORKSPACE_CLASS : INACTIVE_WORKSPACE_CLASS}`}>
                Staff
              </Link>
            </nav>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 md:justify-end">
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
      </MobileMenuPanel>
    </AdminSurface>
  );
}
