"use client";

import { LayoutDashboard, BarChart3, Search, FileText, Settings, TrendingUp } from "lucide-react";

export const TABS = [
  { id: "overview", label: "개요", icon: LayoutDashboard },
  { id: "traffic", label: "트래픽", icon: BarChart3 },
  { id: "search", label: "검색/SEO", icon: Search },
  { id: "blog", label: "블로그", icon: FileText },
  { id: "trend", label: "트렌드", icon: TrendingUp },
  { id: "settings", label: "설정", icon: Settings },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface AdminTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <nav
      className="flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      aria-label="대시보드 탭"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            title={tab.label}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-primary)] text-white"
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
