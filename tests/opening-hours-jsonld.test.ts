import assert from "node:assert/strict";
import { test } from "node:test";
import { HOURS } from "../lib/constants";
import { getOpeningHoursJsonLd } from "../lib/opening-hours-jsonld";
import type { SiteHours } from "../lib/site-config-supabase";

const hours = (): SiteHours => ({
  ...HOURS,
  schedule: HOURS.schedule.map((item) => ({ ...item })),
  exceptions: [],
});

test("평일 점심을 제외하고 야간진료와 토요일 연속진료를 보존한다", () => {
  const schema = getOpeningHoursJsonLd(hours());
  const times = (day: string) => schema.openingHoursSpecification
    .filter((item) => item.dayOfWeek === day).map(({ opens, closes }) => [opens, closes]);
  assert.deepEqual(times("Monday"), [["09:30", "13:00"], ["14:00", "18:30"]]);
  assert.deepEqual(times("Tuesday"), [["09:30", "13:00"], ["14:00", "20:30"]]);
  assert.deepEqual(times("Saturday"), [["09:30", "13:30"]]);
  assert.deepEqual(times("Wednesday"), [["00:00", "00:00"]]);
  assert.equal("specialOpeningHoursSpecification" in schema, false);
});

test("임시 휴진과 변경진료는 지정된 달력 날짜에만 적용한다", () => {
  const value = hours();
  value.exceptions = [
    { date: "2026-11-09", open: false, time: "휴진" },
    { date: "2026-11-10", open: true, time: "10:00 - 16:00" },
    { date: "2026-11-14", open: true, time: "09:30 - 13:30" },
  ];
  const items = getOpeningHoursJsonLd(value).specialOpeningHoursSpecification!;
  assert.deepEqual(items.map(({ validFrom, validThrough, opens, closes }) =>
    [validFrom, validThrough, opens, closes]), [
    ["2026-11-09", "2026-11-09", "00:00", "00:00"],
    ["2026-11-10", "2026-11-10", "10:00", "13:00"],
    ["2026-11-10", "2026-11-10", "14:00", "16:00"],
    ["2026-11-14", "2026-11-14", "09:30", "13:30"],
  ]);
});

test("단축진료와 점심시간이 일부 겹치면 진료 범위를 넘기지 않는다", () => {
  const value = hours();
  value.schedule = [{ day: "월요일", open: true, time: "09:30 - 13:30" }];
  assert.deepEqual(getOpeningHoursJsonLd(value).openingHoursSpecification.map(({ opens, closes }) =>
    [opens, closes]), [["09:30", "13:00"]]);
  value.schedule[0].time = "13:30 - 18:30";
  assert.equal(getOpeningHoursJsonLd(value).openingHoursSpecification[0].opens, "14:00");
  value.exceptions = [{ date: "2026-11-09", open: true, time: "13:00 - 14:00" }];
  assert.equal(getOpeningHoursJsonLd(value).specialOpeningHoursSpecification![0].opens, "00:00");
});

test("유효하지 않은 시간과 날짜는 구조화 데이터에 내보내지 않는다", () => {
  const value = hours();
  value.schedule = [{ day: "월요일", open: true, time: "예약 문의" }];
  value.exceptions = [{ date: "2026-02-30", open: false, time: "휴진" }];
  assert.deepEqual(getOpeningHoursJsonLd(value), { openingHoursSpecification: [] });
});

test("운영 설정에서 점심시간을 변경하거나 비우면 반영한다", () => {
  const value = hours();
  value.lunchTime = "12:30~13:30";
  assert.equal(getOpeningHoursJsonLd(value).openingHoursSpecification[0].closes, "12:30");
  value.lunchTime = "";
  assert.equal(getOpeningHoursJsonLd(value).openingHoursSpecification[0].closes, "18:30");
});
