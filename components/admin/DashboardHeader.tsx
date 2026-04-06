"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { CLINIC } from "@/lib/constants";

// -------------------------------------------------------------
// 관리자 대시보드 헤더
// -------------------------------------------------------------

interface DashboardHeaderProps {
  onLogout: () => void;
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  return (
    <AdminSurface
      tone="dark"
      className="border-x-0 border-t-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]"
    >
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 md:gap-4">
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
            <div className="hidden flex-col gap-1 md:flex">
              <AdminPill tone="amber" className="w-fit text-xs">관리자 콘솔</AdminPill>
              <p className="text-xs text-slate-400">운영 홈, 콘텐츠, 운영 분석, 시스템</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center md:justify-end">
          <AdminActionButton
            onClick={onLogout}
            tone="ghost"
            className="rounded-full border-white/10 bg-white/6 px-4 text-white"
          >
            로그아웃
          </AdminActionButton>
        </div>
      </header>
    </AdminSurface>
  );
}
