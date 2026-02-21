"use client";

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
    <div className="rounded-lg bg-[var(--background)] p-3 text-center">
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
          ) : change >= 0 ? (
            invertChange ? (
              <span className="text-red-600">▼ {change}%</span>
            ) : (
              <span className="text-green-600">▲ {change}%</span>
            )
          ) : invertChange ? (
            <span className="text-green-600">▲ {Math.abs(change)}%</span>
          ) : (
            <span className="text-red-600">▼ {Math.abs(change)}%</span>
          )}
        </p>
      )}
    </div>
  );
}
