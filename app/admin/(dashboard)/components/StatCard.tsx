// Shared component used by OverviewTab and BlogTab

export interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  /**
   * "compact"  — rounded-lg bg-gray-50 p-3 (OverviewTab inline cards)
   * "elevated" — rounded-xl bg-[var(--surface)] p-4 shadow-sm (BlogTab standalone cards)
   * Default: "compact"
   */
  variant?: "compact" | "elevated";
}

export function StatCard({
  label,
  value,
  color = "text-[var(--foreground)]",
  variant = "compact",
}: StatCardProps) {
  const containerClass =
    variant === "elevated"
      ? "rounded-xl bg-[var(--surface)] p-4 text-center shadow-sm"
      : "rounded-lg bg-gray-50 p-3 text-center";

  return (
    <div className={containerClass}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
