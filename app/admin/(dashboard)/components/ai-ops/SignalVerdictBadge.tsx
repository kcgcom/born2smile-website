"use client";

import { AdminPill } from "@/components/admin/AdminChrome";
import type { AiOpsSignalVerdict } from "@/lib/admin-ai-ops-types";

export function SignalVerdictBadge({ verdict }: { verdict: AiOpsSignalVerdict }) {
  switch (verdict) {
    case "strong_positive":
      return <AdminPill tone="sky">강한 개선 신호</AdminPill>;
    case "weak_positive":
      return <AdminPill tone="sky">약한 개선 신호</AdminPill>;
    case "weak_negative":
      return <AdminPill tone="warning">약한 악화 신호</AdminPill>;
    case "strong_negative":
      return <AdminPill tone="warning">강한 악화 신호</AdminPill>;
    default:
      return <AdminPill tone="white">판정 유보</AdminPill>;
  }
}
