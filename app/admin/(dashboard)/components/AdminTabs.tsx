"use client";

import { BarChart3, FileText, Gauge, LayoutDashboard, MousePointerClick, Settings } from "lucide-react";

export const ADMIN_TABS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: FileText },
  { id: "seo", label: "유입·SEO", icon: BarChart3 },
  { id: "conversion", label: "전환", icon: MousePointerClick },
  { id: "settings", label: "사이트 설정", icon: Settings },
  { id: "devtools", label: "개발도구", icon: Gauge },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export function AdminTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
}) {
  return (
    <nav
      className="flex flex-row gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="관리자 콘솔 탭"
    >
      {ADMIN_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition-all ${
              isActive
                ? "bg-white font-semibold text-[var(--color-primary)] shadow-sm"
                : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
