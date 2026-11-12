import { expect, test } from "@playwright/test";
import { getClinicStatus, getTodayKST } from "../lib/date";
import { getNextPublishDate } from "../lib/publish-schedule";
import { HOURS } from "../lib/constants";
import type { SiteHours } from "../lib/site-config-supabase";

const hours = (): SiteHours => ({ ...HOURS, schedule: HOURS.schedule.map((day) => ({ ...day })), exceptions: [] });

test("KST 새벽에도 실제 발행 요일과 예약 점유를 지킨다", () => {
  const today = getTodayKST(new Date("2026-11-12T01:00:00+09:00"));
  expect(today).toBe("2026-11-12");
  expect(getNextPublishDate({ today, publishDays: [1, 3, 5], posts: [] })).toBe("2026-11-13");
  expect(getNextPublishDate({ today, publishDays: [1, 3, 5], posts: [
    { date: "2026-11-13", published: true }, { date: "2026-11-16", published: false },
  ] })).toBe("2026-11-16");
});

test("KST 연도 경계와 브라우저 시간대에 무관한 날짜 계산", () => {
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "Asia/Seoul", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      const today = getTodayKST(new Date("2026-12-31T15:01:00Z"));
      expect(today).toBe("2027-01-01");
      expect(getNextPublishDate({ today, publishDays: [1], posts: [] })).toBe("2027-01-04");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("설정 누락이나 예약 포화는 임의의 다음 날로 대체하지 않는다", () => {
  expect(getNextPublishDate({ today: "2026-11-12", posts: [] })).toBe("");
  expect(getNextPublishDate({ today: "2026-11-12", publishDays: [], posts: [] })).toBe("");
  const start = Date.parse("2026-11-12T00:00:00Z");
  const posts = Array.from({ length: 90 }, (_, index) => ({ published: true, date: new Date(start + index * 86400000).toISOString().slice(0, 10) }));
  expect(getNextPublishDate({ today: "2026-11-12", publishDays: [1, 3, 5], posts })).toBe("");
});

test("진료시간 변경과 점심시간·마감 경계를 운영 설정으로 계산한다", () => {
  const value = hours();
  value.schedule.find((day) => day.day === "목요일")!.time = "11:00 - 17:00";
  value.lunchTime = "12:00 - 13:00";
  expect(getClinicStatus(value, new Date("2026-11-12T10:00:00+09:00")).message).toBe("오늘 오전 11:00 진료 시작");
  expect(getClinicStatus(value, new Date("2026-11-12T11:00:00+09:00")).status).toBe("open");
  expect(getClinicStatus(value, new Date("2026-11-12T12:00:00+09:00"))).toEqual({ status: "lunch", message: "점심시간 · 오후 1:00 진료 재개" });
  expect(getClinicStatus(value, new Date("2026-11-12T13:00:00+09:00")).status).toBe("open");
  expect(getClinicStatus(value, new Date("2026-11-12T17:00:00+09:00")).status).toBe("closed");
});

test("예외 휴진·변경진료와 다음 진료일을 반영한다", () => {
  const value = hours();
  value.exceptions = [
    { date: "2026-11-12", open: false, time: "휴진" },
    { date: "2026-11-13", open: false, time: "휴진" },
    { date: "2026-11-14", open: true, time: "10:00 - 15:00" },
  ];
  expect(getClinicStatus(value, new Date("2026-11-12T11:00:00+09:00"))).toEqual({ status: "closed", message: "11월 14일 오전 10:00 진료 시작" });
  expect(getClinicStatus(value, new Date("2026-11-14T13:15:00+09:00")).status).toBe("open");
  value.exceptions = [{ date: "2026-11-11", open: true, time: "10:00 - 16:00" }];
  expect(getClinicStatus(value, new Date("2026-11-11T11:00:00+09:00")).status).toBe("open");
});

test("해석할 수 없는 시간은 상담 가능이라고 추측하지 않는다", () => {
  const value = hours();
  value.schedule.find((day) => day.day === "목요일")!.time = "예약 문의";
  expect(getClinicStatus(value, new Date("2026-11-12T11:00:00+09:00"))).toEqual({ status: "closed", message: "진료 시간을 확인해 주세요" });
});
