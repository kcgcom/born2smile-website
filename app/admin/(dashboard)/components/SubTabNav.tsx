"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

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
    <nav
      className="mb-6 flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-amber-600 text-white"
                : "text-[var(--muted)] hover:bg-[var(--background)]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
