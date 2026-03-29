"use client";

import { Code, Lightbulb, FileText, Settings } from "lucide-react";
import { AdminPill, AdminSurface } from "@/components/admin/AdminChrome";

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
    <AdminSurface tone="white" className="rounded-2xl px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">탭 탐색</p>
          <p className="text-xs text-[var(--muted)]">필요한 관리 화면으로 빠르게 이동하세요.</p>
        </div>
        <AdminPill tone="white" className="hidden sm:inline-flex">4개 섹션</AdminPill>
      </div>
      <nav
        className="flex flex-row gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
              onMouseEnter={() => onHover?.(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm shadow-blue-950/15"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--color-primary)]/25 hover:text-[var(--foreground)]"
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
