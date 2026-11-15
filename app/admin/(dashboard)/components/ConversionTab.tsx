"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";
import { ConversionSubTab } from "@/app/admin/(dashboard)/components/insight/ConversionSubTab";

export function ConversionReportTab() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">문의·공유</h2>

          </div>

        </div>
      </AdminSurface>
      <ConversionSubTab />
    </div>
  );
}
