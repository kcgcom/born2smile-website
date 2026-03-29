"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TABS } from "./AdminTabs";

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

  const parentLabel = TABS.find((t) => t.id === parentTab)?.label ?? parentTab;

  return (
    <nav
      className="mb-6 flex flex-row items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={ariaLabel}
    >
      {/* 브레드크럼 레이블 */}
      <div className="flex shrink-0 items-center gap-0.5 px-3">
        <span className="text-xs font-medium text-slate-500">{parentLabel}</span>
        <ChevronRight size={11} className="text-slate-400" aria-hidden="true" />
      </div>
      {tabs.map((tab) => {
        const isActive = tab.id === activeSub;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleSubChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-all ${
              isActive
                ? "bg-white font-semibold text-amber-600 shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={13} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
