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
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-1 px-1">
        <span className="text-xs font-medium text-slate-400">{parentLabel}</span>
        <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
      </div>
      <nav
        className="flex flex-row gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={ariaLabel}
      >
      {tabs.map((tab) => {
        const isActive = tab.id === activeSub;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => handleSubChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition-all ${
              isActive
                ? "bg-white font-semibold text-amber-600 shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
      </nav>
    </div>
  );
}
