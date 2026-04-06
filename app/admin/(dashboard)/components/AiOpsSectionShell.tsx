"use client";

import { ClipboardCheck, History, LayoutList, Sparkles } from "lucide-react";
import { PathSubNav } from "./PathSubNav";

const AI_OPS_ITEMS = [
  { href: "/admin/growth/ai-ops/briefing", label: "운영 브리핑", icon: Sparkles },
  { href: "/admin/growth/ai-ops/suggestions", label: "개선 제안", icon: LayoutList },
  { href: "/admin/growth/ai-ops/queue", label: "승인 대기함", icon: ClipboardCheck },
  { href: "/admin/growth/ai-ops/activity", label: "활동 로그", icon: History },
] as const;

export function AiOpsSectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PathSubNav parentLabel="AI 운영실" ariaLabel="AI 운영실 세부 화면" items={[...AI_OPS_ITEMS]} />
      {children}
    </div>
  );
}
