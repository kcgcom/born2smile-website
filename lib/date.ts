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

/** KST 기준 현재 Date 객체 반환 */
function getKSTDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export type ClinicStatus = "open" | "lunch" | "closed";

export interface ClinicStatusInfo {
  status: ClinicStatus;
  message: string;
}

// 요일별 진료시간 (0=일, 1=월, ..., 6=토)
const SCHEDULE: { open: boolean; start?: number; end?: number; noLunch?: boolean }[] = [
  { open: false },                                    // 일
  { open: true, start: 9.5, end: 18.5 },              // 월
  { open: true, start: 9.5, end: 20.5 },              // 화 (야간)
  { open: false },                                    // 수 (휴진)
  { open: true, start: 9.5, end: 18.5 },              // 목
  { open: true, start: 9.5, end: 18.5 },              // 금
  { open: true, start: 9.5, end: 13.5, noLunch: true }, // 토
];

const LUNCH_START = 13;
const LUNCH_END = 14;

/** 다음 진료 시작 시점 메시지 */
function getNextOpenMessage(dayOfWeek: number): string {
  // 다음 진료일 찾기 (최대 7일 탐색)
  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7;
    if (SCHEDULE[nextDay].open) {
      const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
      if (i === 1) return `내일(${dayNames[nextDay]}) 오전 9:30 진료 시작`;
      return `${dayNames[nextDay]}요일 오전 9:30 진료 시작`;
    }
  }
  return "진료 시간을 확인해 주세요";
}

/**
 * 현재 KST 시간 기준으로 진료 상태를 반환합니다.
 * 클라이언트 컴포넌트에서 사용 — 실시간 상태 표시용.
 */
export function getClinicStatus(): ClinicStatusInfo {
  const kst = getKSTDate();
  const day = kst.getUTCDay();
  const hour = kst.getUTCHours() + kst.getUTCMinutes() / 60;

  const today = SCHEDULE[day];

  if (!today.open) {
    return { status: "closed", message: getNextOpenMessage(day) };
  }

  if (hour < today.start!) {
    return { status: "closed", message: "오늘 오전 9:30 진료 시작" };
  }

  if (hour >= today.end!) {
    return { status: "closed", message: getNextOpenMessage(day) };
  }

  if (!today.noLunch && hour >= LUNCH_START && hour < LUNCH_END) {
    return { status: "lunch", message: "점심시간 · 오후 2시 진료 재개" };
  }

  return { status: "open", message: "지금 전화 상담 가능" };
}
