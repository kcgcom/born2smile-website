"use client";

import { Code, Lightbulb, FileText, Settings } from "lucide-react";

export const TABS = [
  { id: "dev", label: "개발", icon: Code },
  { id: "insight", label: "인사이트", icon: Lightbulb },
  { id: "blog", label: "블로그", icon: FileText },
  { id: "settings", label: "설정", icon: Settings },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface AdminTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onHover?: (tab: TabId) => void;
}

export function AdminTabs({ activeTab, onTabChange, onHover }: AdminTabsProps) {
  return (
    <nav
      className="flex flex-row gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="대시보드 탭"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => onHover?.(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition-all ${
              isActive
                ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
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
  );
}
