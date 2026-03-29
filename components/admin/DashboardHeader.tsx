"use client";

import { ExternalLink } from "lucide-react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
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
          <div className="flex flex-wrap items-center gap-2">
            <AdminActionLink
              href="/"
              tone="ghost"
              className="rounded-full border-white/10 bg-white/6 px-3 py-1.5 text-base font-semibold text-white"
              title="사이트로 이동"
            >
              {CLINIC.name}
              <ExternalLink size={14} className="text-slate-300" aria-hidden="true" />
            </AdminActionLink>
            <AdminPill tone="amber" className="text-xs">관리자 콘솔</AdminPill>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            운영 지표, 블로그, 사이트 설정을 한 곳에서 관리합니다.
          </p>
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
