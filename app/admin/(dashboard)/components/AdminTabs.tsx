"use client";

import { BarChart3, Bot, FileText, Gauge, LayoutDashboard, MousePointerClick, Settings } from "lucide-react";

export const ADMIN_TABS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: FileText },
  { id: "seo", label: "유입·SEO", icon: BarChart3 },
  { id: "conversion", label: "전환", icon: MousePointerClick },
  { id: "aiops", label: "AI 운영실", icon: Bot },
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
      className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1 sm:flex sm:flex-row sm:overflow-x-auto sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
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
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all sm:min-w-[132px] sm:flex-1 sm:whitespace-nowrap sm:px-4 ${
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
