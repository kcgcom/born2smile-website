"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminSubTabDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function useAdminSubTab<T extends readonly AdminSubTabDef[]>(
  tabs: T,
  defaultSub: T[number]["id"],
): T[number]["id"] {
  const searchParams = useSearchParams();
  const rawSub = searchParams.get("sub");
  const validIds = tabs.map((tab) => tab.id) as string[];
  return validIds.includes(rawSub ?? "") ? (rawSub as T[number]["id"]) : defaultSub;
}

export function AdminSubTabs<T extends readonly AdminSubTabDef[]>({
  tabs,
  parentLabel,
  parentTab,
  defaultSub,
}: {
  tabs: T;
  parentLabel: string;
  parentTab: string;
  defaultSub: T[number]["id"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSub = useAdminSubTab(tabs, defaultSub);

  const handleSubChange = (sub: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", parentTab);
    params.set("sub", sub);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <nav
      className="mb-6 flex flex-row items-center gap-1 overflow-x-auto rounded-xl bg-slate-100/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={`${parentLabel} 서브탭`}
    >
      <div className="flex shrink-0 items-center gap-0.5 px-3">
        <span className="text-xs font-medium text-slate-500">{parentLabel}</span>
        <ChevronRight size={11} className="text-slate-400" aria-hidden="true" />
      </div>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeSub;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleSubChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-all ${
              isActive
                ? "bg-white font-semibold text-amber-600 shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={13} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
