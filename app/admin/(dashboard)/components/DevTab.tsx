"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, Gauge, BookOpen } from "lucide-react";
import { ProjectTab } from "./ProjectTab";
import { PerformanceTab } from "./PerformanceTab";
import { ReferenceTab } from "./ReferenceTab";

// -------------------------------------------------------------
// 개발 탭 — 서브탭 네비게이션 + 콘텐츠
// -------------------------------------------------------------

const SUB_TABS = [
  { id: "project", label: "현황", icon: ClipboardCheck },
  { id: "perf", label: "성능", icon: Gauge },
  { id: "ref", label: "레퍼런스", icon: BookOpen },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

export function DevTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSub = searchParams.get("sub");
  const validSubIds = SUB_TABS.map((t) => t.id) as string[];
  const activeSub: SubTabId = validSubIds.includes(rawSub ?? "")
    ? (rawSub as SubTabId)
    : "project";

  const handleSubChange = (sub: SubTabId) => {
    router.replace(`${pathname}?tab=dev&sub=${sub}`);
  };

  return (
    <div>
      {/* 서브탭 네비게이션 */}
      <nav
        className="mb-6 flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="개발 서브탭"
      >
        {SUB_TABS.map((tab) => {
          const isActive = tab.id === activeSub;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              title={tab.label}
              onClick={() => handleSubChange(tab.id)}
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

      {/* 서브탭 콘텐츠 */}
      {activeSub === "project" && <ProjectTab />}
      {activeSub === "perf" && <PerformanceTab />}
      {activeSub === "ref" && <ReferenceTab />}
    </div>
  );
}
