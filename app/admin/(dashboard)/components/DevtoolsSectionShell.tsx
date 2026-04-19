"use client";

import { BookOpen, ClipboardCheck, Gauge, Sparkles } from "lucide-react";
import { PathSubNav } from "./PathSubNav";

const DEVTOOLS_ITEMS = [
  { href: "/admin/system/devtools/project", label: "현황", icon: ClipboardCheck },
  { href: "/admin/system/devtools/perf", label: "성능", icon: Gauge },
  { href: "/admin/system/devtools/ref", label: "레퍼런스", icon: BookOpen },
  { href: "/admin/system/devtools/ai", label: "AI 로그", icon: Sparkles },
] as const;

export function DevtoolsSectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PathSubNav parentLabel="개발도구" ariaLabel="개발도구 세부 화면" items={[...DEVTOOLS_ITEMS]} />
      {children}
    </div>
  );
}
