import type { SiteHours } from "./site-config-supabase";
import { DAY_NAMES, DAYS, getIntervals } from "./clinic-hours";

/**
 * KST(한국 표준시) 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다.
 * UTC 기준 new Date().toISOString().slice(0,10) 사용 시
 * KST 00:00~08:59 사이에 전날 날짜가 반환되는 문제를 방지합니다.
 */
export function getTodayKST(now = new Date()): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + kstOffset).toISOString().slice(0, 10);
}

export type ClinicStatus = "open" | "lunch" | "closed";

export interface ClinicStatusInfo {
  status: ClinicStatus;
  message: string;
}

function intervalsForDate(hours: SiteHours, date: string) {
  const day = DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const entry = hours.exceptions.find((item) => item.date === date)
    ?? hours.schedule.find((item) => DAY_NAMES[item.day] === day);
  if (!entry) return null;
  if (!entry.open) return [];
  const intervals = getIntervals(entry.time, day, hours.lunchTime);
  return intervals.length ? intervals.filter((item) => item.opens < item.closes) : null;
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours < 12 ? "오전" : "오후"} ${hours % 12 || 12}:${String(minutes).padStart(2, "0")}`;
}

/** 운영 진료시간과 날짜별 예외를 KST 기준으로 평가한다. */
export function getClinicStatus(hours: SiteHours, now = new Date()): ClinicStatusInfo {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const date = kst.toISOString().slice(0, 10);
  const time = kst.toISOString().slice(11, 16);
  const intervals = intervalsForDate(hours, date);
  const unknown: ClinicStatusInfo = { status: "closed", message: "진료 시간을 확인해 주세요" };
  if (intervals === null) return unknown;
  if (intervals.some((item) => item.opens <= time && time < item.closes)) {
    return { status: "open", message: "지금 전화 상담 가능" };
  }
  const next = intervals.find((item) => item.opens > time);
  if (next) {
    if (intervals.some((item) => item.closes <= time)) {
      return { status: "lunch", message: `점심시간 · ${formatTime(next.opens)} 진료 재개` };
    }
    return { status: "closed", message: `오늘 ${formatTime(next.opens)} 진료 시작` };
  }
  // 가까운 재개일을 확인할 수 없으면 추측한 시간을 표시하지 않는다.
  const cursor = new Date(`${date}T00:00:00Z`);
  for (let i = 1; i <= 14; i += 1) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const nextDate = cursor.toISOString().slice(0, 10);
    const upcoming = intervalsForDate(hours, nextDate);
    if (upcoming === null) return unknown;
    if (upcoming.length) {
      const label = i === 1 ? "내일" : `${cursor.getUTCMonth() + 1}월 ${cursor.getUTCDate()}일`;
      return { status: "closed", message: `${label} ${formatTime(upcoming[0].opens)} 진료 시작` };
    }
  }
  return unknown;
}
