"use client";

import { BarChart3, Search, TrendingUp } from "lucide-react";
import { TrafficTab } from "@/app/admin/(dashboard)/components/TrafficTab";
import { SearchTab } from "@/app/admin/(dashboard)/components/SearchTab";
import { TrendSubTab } from "@/app/admin/(dashboard)/components/insight/TrendSubTab";
import { AdminSubTabs, useAdminSubTab } from "./AdminSubTabs";

const SUB_TABS = [
  { id: "traffic", label: "트래픽", icon: BarChart3 },
  { id: "search", label: "검색 성과", icon: Search },
  { id: "trend", label: "트렌드", icon: TrendingUp },
] as const;

export function SeoTab() {
  const activeSub = useAdminSubTab(SUB_TABS, "search");

  return (
    <div>
      <AdminSubTabs tabs={SUB_TABS} parentLabel="유입·SEO" parentTab="seo" defaultSub="search" />
      {activeSub === "traffic" && <TrafficTab />}
      {activeSub === "search" && <SearchTab />}
      {activeSub === "trend" && <TrendSubTab />}
    </div>
  );
}
