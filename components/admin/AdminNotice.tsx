"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

type NoticeTone = "success" | "error" | "info" | "warning";

const toneClasses: Record<NoticeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-600",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

const toneIcons: Record<NoticeTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: TriangleAlert,
};

export function AdminNotice({
  tone,
  children,
  className,
}: {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const Icon = toneIcons[tone];

  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${toneClasses[tone]} ${className ?? ""}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
