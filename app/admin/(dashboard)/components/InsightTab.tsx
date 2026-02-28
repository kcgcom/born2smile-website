"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LayoutDashboard, BarChart3, Search, Target, TrendingUp } from "lucide-react";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";

// -------------------------------------------------------------
// 인사이트 탭 — 서브탭 네비게이션 + 콘텐츠
// -------------------------------------------------------------

const SUB_TABS = [
  { id: "summary", label: "요약", icon: LayoutDashboard },
  { id: "traffic", label: "트래픽", icon: BarChart3 },
  { id: "search", label: "검색 성과", icon: Search },
  { id: "strategy", label: "콘텐츠 전략", icon: Target },
  { id: "trend", label: "트렌드", icon: TrendingUp },
] as const;

type SubTabId = (typeof SUB_TABS)[number]["id"];

// -------------------------------------------------------------
// 서브탭별 코드 스플리팅
// -------------------------------------------------------------

const SummarySubTab = dynamic(
  () => import("./insight/SummarySubTab").then((m) => m.SummarySubTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const TrafficTab = dynamic(
  () => import("./TrafficTab").then((m) => m.TrafficTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const SearchTab = dynamic(
  () => import("./SearchTab").then((m) => m.SearchTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const StrategySubTab = dynamic(
  () => import("./insight/StrategySubTab").then((m) => m.StrategySubTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);
const TrendSubTab = dynamic(
  () => import("./insight/TrendSubTab").then((m) => m.TrendSubTab),
  { loading: () => <AdminLoadingSkeleton variant="full" />, ssr: false },
);

export function InsightTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawSub = searchParams.get("sub");
  const validSubIds = SUB_TABS.map((t) => t.id) as string[];
  const activeSub: SubTabId = validSubIds.includes(rawSub ?? "")
    ? (rawSub as SubTabId)
    : "summary";

  const handleSubChange = (sub: SubTabId) => {
    router.replace(`${pathname}?tab=insight&sub=${sub}`);
  };

  return (
    <div>
      {/* 서브탭 네비게이션 */}
      <nav
        className="mb-6 flex flex-row gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        aria-label="인사이트 서브탭"
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

      {/* 서브탭 콘텐츠 */}
      {activeSub === "summary" && <SummarySubTab />}
      {activeSub === "traffic" && <TrafficTab />}
      {activeSub === "search" && <SearchTab />}
      {activeSub === "strategy" && <StrategySubTab />}
      {activeSub === "trend" && <TrendSubTab />}
    </div>
  );
}
