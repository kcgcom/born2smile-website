/** Dates in analytics responses are calendar dates, compared in KST. */
export function dataAgeDays(value: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${value}T00:00:00Z`)) / 86_400_000;
  return Number.isFinite(age) && age >= 0 ? age : null;
}

export function formatShareYield(visits: number, actions: number): string {
  if (actions <= 0) return "—";
  return `${(visits / actions).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}회`;
}

export const SHARE_YIELD_DESCRIPTION = "선택 기간의 공유 유입 이벤트 수 ÷ 공유 시도 이벤트 수입니다. 방문자 수나 전환율이 아니며 반복 유입이 포함될 수 있습니다. 공유 시점과 유입 시점이 달라 같은 기간의 공유와 일대일로 대응하지 않습니다. 공유 시도가 0이면 계산하지 않습니다.";
