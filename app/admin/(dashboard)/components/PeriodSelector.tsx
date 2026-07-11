"use client";

interface PeriodSelectorProps {
  periods: Array<{ value: string; label: string }>;
  selected: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PeriodSelector({
  periods,
  selected,
  onChange,
  disabled = false,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-row gap-1">
      {periods.map((period) => {
        const isSelected = period.value === selected;
        return (
          <button
            key={period.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(period.value)}
            aria-label={`${period.label} 기간 선택`}
            aria-pressed={isSelected}
            className={`rounded px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--background)] text-[var(--muted)] hover:bg-[var(--border)]"
            }`}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
