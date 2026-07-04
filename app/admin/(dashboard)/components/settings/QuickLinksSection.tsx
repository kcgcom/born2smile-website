"use client";

import { MapPin, Star, type LucideIcon } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";

const QUICK_LINKS: ReadonlyArray<{ label: string; href: string; icon: LucideIcon }> = [
  {
    label: "네이버 플레이스 관리",
    href: "https://new.smartplace.naver.com/",
    icon: MapPin,
  },
  {
    label: "Google 리뷰 관리",
    href: "https://business.google.com/",
    icon: Star,
  },
  {
    label: "네이버 리뷰 보기",
    href: "https://m.place.naver.com/hospital/698879488/review/visitor",
    icon: Star,
  },
];

export function QuickLinksSection() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-[var(--foreground)]">빠른 링크</h3>
        <AdminPill tone="white" className="text-[10px]">외부 도구</AdminPill>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        자주 여는 외부 운영 도구로 바로 이동할 수 있습니다.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)]/85 p-4 text-center transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-[var(--muted)]" aria-hidden="true">
              <link.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-[var(--foreground)] leading-tight">
              {link.label}
              <span className="sr-only"> (새 창에서 열림)</span>
            </span>
          </a>
        ))}
      </div>
    </AdminSurface>
  );
}
