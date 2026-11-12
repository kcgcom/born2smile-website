import type { SiteHours } from "./site-config-supabase";

import { DAYS, DAY_NAMES, getIntervals } from "./clinic-hours";

/** 날짜 문자열은 KST 달력 날짜 그대로 보존한다. 시간대 변환을 하지 않는다. */
export function getOpeningHoursJsonLd(hours: SiteHours) {
  const closed = { opens: "00:00", closes: "00:00" };
  const openingHoursSpecification = hours.schedule.flatMap((item) => {
    const dayOfWeek = DAY_NAMES[item.day];
    if (!dayOfWeek) return [];
    const intervals = item.open ? getIntervals(item.time, dayOfWeek, hours.lunchTime) : [closed];
    return intervals.map((interval) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek,
      ...interval,
    }));
  });
  const specialOpeningHoursSpecification = hours.exceptions.flatMap((item) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return [];
    const date = new Date(`${item.date}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.date) return [];
    const intervals = item.open ? getIntervals(item.time, DAYS[date.getUTCDay()], hours.lunchTime) : [closed];
    return intervals.map((interval) => ({
      "@type": "OpeningHoursSpecification",
      validFrom: item.date,
      validThrough: item.date,
      ...interval,
    }));
  });
  return {
    openingHoursSpecification,
    ...(specialOpeningHoursSpecification.length > 0 && { specialOpeningHoursSpecification }),
  };
}
