export const CHART_COLORS = [
  "#2563EB", // var(--color-primary)
  "#C9962B", // var(--color-gold)
  "#0EA5E9", // var(--color-secondary)
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F59E0B", // amber
];

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "모바일",
  desktop: "데스크톱",
  tablet: "태블릿",
};

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateLabel(date: string): string {
  if (date.length === 10) {
    const d = new Date(date + "T00:00:00");
    const day = DAY_NAMES[d.getDay()];
    return date.slice(5).replace("-", ".") + `(${day})`;
  }
  return date;
}
