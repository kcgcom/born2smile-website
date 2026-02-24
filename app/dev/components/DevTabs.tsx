"use client";

import { ClipboardCheck, Gauge, BookOpen } from "lucide-react";

export const DEV_TABS = [
  { id: "project", label: "현황", icon: ClipboardCheck },
  { id: "performance", label: "성능", icon: Gauge },
  { id: "reference", label: "레퍼런스", icon: BookOpen },
] as const;

export type DevTabId = (typeof DEV_TABS)[number]["id"];

interface DevTabsProps {
  activeTab: DevTabId;
  onTabChange: (tab: DevTabId) => void;
}

export function DevTabs({ activeTab, onTabChange }: DevTabsProps) {
  return (
    <nav
      className="flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      aria-label="개발 대시보드 탭"
    >
      {DEV_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            title={tab.label}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-emerald-600 text-white"
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
