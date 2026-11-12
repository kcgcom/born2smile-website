export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES: Record<string, string> = {
  일요일: "Sunday", 월요일: "Monday", 화요일: "Tuesday", 수요일: "Wednesday",
  목요일: "Thursday", 금요일: "Friday", 토요일: "Saturday",
};

function parseRange(value: string) {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*[-–~]\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const opens = `${match[1]}:${match[2]}`;
  const closes = `${match[3]}:${match[4]}`;
  return opens < closes ? { opens, closes } : null;
}

export function getIntervals(time: string, day: string, lunchTime: string) {
  const range = parseRange(time);
  if (!range) return [];
  const lunch = parseRange(lunchTime);
  // 현재 병원 운영 정책: 토요일은 점심시간 없이 진료한다.
  if (day === "Saturday" || !lunch || lunch.closes <= range.opens || lunch.opens >= range.closes) {
    return [range];
  }
  const intervals = [
    ...(range.opens < lunch.opens ? [{ opens: range.opens, closes: lunch.opens }] : []),
    ...(lunch.closes < range.closes ? [{ opens: lunch.closes, closes: range.closes }] : []),
  ];
  return intervals.length ? intervals : [{ opens: "00:00", closes: "00:00" }];
}
