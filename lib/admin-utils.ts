/** 두 기간 지표의 변화율(%) 계산. 이전 값이 0이면 null 반환. */
export function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
