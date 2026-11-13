"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number | null;
  color?: string;
  loading?: boolean;
  invertChange?: boolean;
}

export function MetricCard({
  label,
  value,
  change,
  color,
  loading = false,
  invertChange = false,
}: MetricCardProps) {
  return (
    <AdminSurface tone="white" className="rounded-2xl bg-[var(--background)]/85 p-4 text-center">
      {loading ? (
        <div className="mx-auto h-8 w-16 animate-pulse rounded bg-[var(--border)]" />
      ) : (
        <p className={`text-2xl font-bold ${color ?? "text-[var(--foreground)]"}`}>
          {value}
        </p>
      )}
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
      {change !== undefined && (
        <p className="mt-1 text-xs">
          {change === null ? (
            <span className="text-[var(--muted)]">—</span>
          ) : (
            <span
              className={change === 0 ? "text-slate-600" : (invertChange ? change < 0 : change > 0) ? "text-green-700" : "text-red-700"}
              aria-label={`${Math.abs(change)}% ${change === 0 ? "변화 없음" : change > 0 ? "증가" : "감소"}${invertChange ? " · 낮을수록 좋음" : ""}`}
            >
              {change === 0 ? "—" : change > 0 ? "▲" : "▼"} {Math.abs(change)}%
            </span>
          )}
        </p>
      )}
    </AdminSurface>
  );
}
