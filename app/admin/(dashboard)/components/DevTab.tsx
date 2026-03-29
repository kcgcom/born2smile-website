"use client";

import { ClipboardCheck, Gauge, BookOpen } from "lucide-react";
import { SubTabNav, useSubTab } from "./SubTabNav";
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

export function DevTab() {
  const activeSub = useSubTab(SUB_TABS, "project");

  return (
    <div>
      <SubTabNav tabs={SUB_TABS} parentTab="dev" defaultSub="project" ariaLabel="개발 서브탭" />

      {/* 서브탭 콘텐츠 */}
      {activeSub === "project" && <ProjectTab />}
      {activeSub === "perf" && <PerformanceTab />}
      {activeSub === "ref" && <ReferenceTab />}
    </div>
  );
}
