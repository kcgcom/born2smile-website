"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";

// -------------------------------------------------------------
// 공유 서브탭 네비게이션 컴포넌트
// -------------------------------------------------------------

export interface SubTabDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SubTabNavProps<T extends readonly SubTabDef[]> {
  tabs: T;
  parentTab: string;
  defaultSub: T[number]["id"];
  ariaLabel: string;
}

export function useSubTab<T extends readonly SubTabDef[]>(
  tabs: T,
  defaultSub: T[number]["id"],
): T[number]["id"] {
  const searchParams = useSearchParams();
  const rawSub = searchParams.get("sub");
  const validIds = tabs.map((t) => t.id) as string[];
  return validIds.includes(rawSub ?? "") ? (rawSub as T[number]["id"]) : defaultSub;
}

export function SubTabNav<T extends readonly SubTabDef[]>({
  tabs,
  parentTab,
  defaultSub,
  ariaLabel,
}: SubTabNavProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const activeSub = useSubTab(tabs, defaultSub);

  const handleSubChange = (sub: string) => {
    router.replace(`${pathname}?tab=${parentTab}&sub=${sub}`);
  };

  return (
    <AdminSurface tone="white" className="mb-6 rounded-2xl px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">세부 작업</p>
          <p className="text-xs text-[var(--muted)]">현재 탭 안에서 필요한 작업 흐름을 선택하세요.</p>
        </div>
        <AdminPill tone="white" className="hidden sm:inline-flex text-[10px]">
          {tabs.length}개 보기
        </AdminPill>
      </div>
      <nav
        className="flex flex-row gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeSub;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              title={tab.label}
              onClick={() => handleSubChange(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-950/10"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-amber-300 hover:text-[var(--foreground)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </AdminSurface>
  );
}
