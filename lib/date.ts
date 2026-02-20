/**
 * KST(한국 표준시) 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 * UTC 기준 new Date().toISOString().slice(0,10) 사용 시
 * KST 00:00~08:59 사이에 전날 날짜가 반환되는 문제를 방지합니다.
 */
export function getTodayKST(): string {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + kstOffset).toISOString().slice(0, 10);
}
