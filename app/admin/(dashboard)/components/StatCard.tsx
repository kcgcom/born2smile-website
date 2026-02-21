// Shared component used by OverviewTab and BlogTab

export interface StatCardProps {
  label: string;
  value: number;
  color?: string;
  /**
   * "compact"  — rounded-lg bg-[var(--background)] p-3 (OverviewTab inline cards)
   * "elevated" — rounded-xl bg-[var(--surface)] p-4 shadow-sm (BlogTab standalone cards)
   * Default: "compact"
   */
  variant?: "compact" | "elevated";
  /** Makes the card clickable */
  onClick?: () => void;
  /** Highlights the card as active filter */
  active?: boolean;
}

export function StatCard({
  label,
  value,
  color = "text-[var(--foreground)]",
  variant = "compact",
  onClick,
  active,
}: StatCardProps) {
  const base =
    variant === "elevated"
      ? "rounded-xl bg-[var(--surface)] p-4 text-center shadow-sm"
      : "rounded-lg bg-[var(--background)] p-3 text-center";

  const interactive = onClick
    ? "cursor-pointer transition-all hover:ring-2 hover:ring-[var(--color-primary)]/30"
    : "";

  const activeRing = active
    ? "ring-2 ring-[var(--color-primary)]"
    : "";

  const containerClass = `${base} ${interactive} ${activeRing}`.trim();

  return (
    <div
      className={containerClass}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
