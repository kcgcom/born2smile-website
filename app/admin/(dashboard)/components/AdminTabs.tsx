"use client";

export const TABS = [
  { id: "overview", label: "개요" },
  { id: "traffic", label: "트래픽" },
  { id: "search", label: "검색/SEO" },
  { id: "blog", label: "블로그" },
  { id: "settings", label: "설정" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface AdminTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <nav className="flex flex-row gap-1" aria-label="대시보드 탭">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--muted)] hover:bg-gray-50"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
