"use client";

import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";

type IconType = "search" | "chart" | "database" | "code" | "map" | "star";

const QUICK_LINKS = [
  {
    label: "네이버 플레이스 관리",
    href: "https://new.smartplace.naver.com/",
    icon: "map" as const,
  },
  {
    label: "Google 리뷰 관리",
    href: "https://business.google.com/",
    icon: "star" as const,
  },
  {
    label: "네이버 리뷰 보기",
    href: "https://m.place.naver.com/hospital/698879488/review/visitor",
    icon: "star" as const,
  },
] as const;

function QuickLinkIcon({ icon }: { icon: IconType }) {
  switch (icon) {
    case "search":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "chart":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 4-4" />
        </svg>
      );
    case "database":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
        </svg>
      );
    case "code":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "map":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "star":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
  }
}

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
              <QuickLinkIcon icon={link.icon} />
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
