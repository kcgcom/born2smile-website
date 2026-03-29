"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { CLINIC } from "@/lib/constants";

// -------------------------------------------------------------
// 관리자 대시보드 헤더
// -------------------------------------------------------------

interface DashboardHeaderProps {
  userEmail?: string | null;
  onLogout: () => void;
}

export function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  return (
    <AdminSurface
      tone="dark"
      className="border-x-0 border-t-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]"
    >
      <header className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src="/images/Logo_SNU.png"
                alt="서울대학교 엠블럼"
                width={40}
                height={40}
                className="h-8 w-8 md:h-10 md:w-10 brightness-0 invert"
              />
              <span className="text-2xl font-bold tracking-tight text-white">{CLINIC.name}</span>
            </Link>
            <div className="hidden flex-col gap-1 sm:flex">
              <AdminPill tone="amber" className="w-fit text-xs">관리자 콘솔</AdminPill>
              <p className="text-xs text-slate-400">운영 지표, 블로그, 사이트 설정</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {userEmail && (
            <AdminPill tone="slate" className="max-w-full truncate text-xs">
              {userEmail}
            </AdminPill>
          )}
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
