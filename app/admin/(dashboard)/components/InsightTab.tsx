"use client";

import dynamic from "next/dynamic";
import { BarChart3, Search, Target, TrendingUp } from "lucide-react";
import { AdminLoadingSkeleton } from "./AdminLoadingSkeleton";
import { SubTabNav, useSubTab } from "./SubTabNav";

// -------------------------------------------------------------
// 인사이트 탭 — 서브탭 네비게이션 + 콘텐츠
// -------------------------------------------------------------

const SUB_TABS = [
  { id: "traffic", label: "트래픽", icon: BarChart3 },
  { id: "search", label: "검색 성과", icon: Search },
  { id: "strategy", label: "콘텐츠 전략", icon: Target },
  { id: "trend", label: "트렌드", icon: TrendingUp },
] as const;

// -------------------------------------------------------------
// 서브탭별 코드 스플리팅
// -------------------------------------------------------------

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
  const activeSub = useSubTab(SUB_TABS, "traffic");

  return (
    <div>
      <SubTabNav tabs={SUB_TABS} parentTab="insight" defaultSub="traffic" ariaLabel="인사이트 서브탭" />

      {/* 서브탭 콘텐츠 */}
      {activeSub === "traffic" && <TrafficTab />}
      {activeSub === "search" && <SearchTab />}
      {activeSub === "strategy" && <StrategySubTab />}
      {activeSub === "trend" && <TrendSubTab />}
    </div>
  );
}
