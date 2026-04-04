"use client";

import { ClipboardCheck, History, LayoutList, Sparkles } from "lucide-react";
import { AdminSubTabs, useAdminSubTab } from "./AdminSubTabs";
import { BriefingSubTab } from "./ai-ops/BriefingSubTab";
import { SuggestionsSubTab } from "./ai-ops/SuggestionsSubTab";
import { QueueSubTab } from "./ai-ops/QueueSubTab";
import { ActivitySubTab } from "./ai-ops/ActivitySubTab";

const SUB_TABS = [
  { id: "briefing", label: "운영 브리핑", icon: Sparkles },
  { id: "suggestions", label: "개선 제안", icon: LayoutList },
  { id: "queue", label: "승인 대기함", icon: ClipboardCheck },
  { id: "activity", label: "활동 로그", icon: History },
] as const;

export function AiOpsTab() {
  const activeSub = useAdminSubTab(SUB_TABS, "briefing");

  return (
    <div>
      <AdminSubTabs tabs={SUB_TABS} parentLabel="AI 운영실" parentTab="aiops" defaultSub="briefing" />
      {activeSub === "briefing" && <BriefingSubTab />}
      {activeSub === "suggestions" && <SuggestionsSubTab />}
      {activeSub === "queue" && <QueueSubTab />}
      {activeSub === "activity" && <ActivitySubTab />}
    </div>
  );
}
