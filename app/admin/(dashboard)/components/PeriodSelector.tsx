"use client";

interface PeriodSelectorProps {
  periods: Array<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
}

export function PeriodSelector({
  periods,
  selected,
  onChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-row gap-1">
      {periods.map((period) => {
        const isSelected = period.value === selected;
        return (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              isSelected
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
            }`}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
