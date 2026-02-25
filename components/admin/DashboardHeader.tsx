"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CLINIC } from "@/lib/constants";

// -------------------------------------------------------------
// 관리자 대시보드 헤더
// -------------------------------------------------------------

interface DashboardHeaderProps {
  userEmail?: string | null;
  onLogout: () => void;
}

const btnClass =
  "flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--foreground)]";

export function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  return (
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
          <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white">
            관리자
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--muted)] sm:inline">
            {userEmail}
          </span>
          <button onClick={onLogout} className={btnClass}>
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
