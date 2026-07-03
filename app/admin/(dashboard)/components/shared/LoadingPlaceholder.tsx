"use client";

import { Loader2 } from "lucide-react";
import { AdminSurface } from "@/components/admin/AdminChrome";

export function LoadingPlaceholder() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>불러오는 중...</span>
      </div>
    </AdminSurface>
  );
}
