"use client";

import { ClipboardCheck, History, Sparkles, Wand2 } from "lucide-react";
import { PathSubNav } from "./PathSubNav";

const AI_OPS_ITEMS = [
  { href: "/admin/operations/ai-ops/briefing", label: "운영 브리핑", icon: Sparkles },
  { href: "/admin/operations/ai-ops/suggestions", label: "실행 센터", icon: Wand2 },
  { href: "/admin/operations/ai-ops/queue", label: "검토·적용", icon: ClipboardCheck },
  { href: "/admin/operations/ai-ops/activity", label: "활동·관측", icon: History },
] as const;

export function AiOpsSectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PathSubNav parentLabel="AI 운영실" ariaLabel="AI 운영실 세부 화면" items={[...AI_OPS_ITEMS]} />
      {children}
    </div>
  );
}
