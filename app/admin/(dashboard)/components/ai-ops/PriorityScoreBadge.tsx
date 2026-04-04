"use client";

export function PriorityScoreBadge({ score }: { score: number }) {
  const tone = score >= 70
    ? "bg-rose-100 text-rose-700"
    : score >= 40
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      우선순위 {score}
    </span>
  );
}
