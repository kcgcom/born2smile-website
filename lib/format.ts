/**
 * 날짜 문자열(YYYY-MM-DD)을 한국식 표기(YYYY.MM.DD)로 변환
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${year}.${month}.${day}`;
}
