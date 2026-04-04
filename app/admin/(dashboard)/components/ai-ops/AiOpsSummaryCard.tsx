"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";

export function AiOpsSummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-500">{helper}</div>}
    </AdminSurface>
  );
}
