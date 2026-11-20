import { z } from "zod";

const GROUPS = [
  { label: "지도 노출", metrics: ["BUSINESS_IMPRESSIONS_DESKTOP_MAPS", "BUSINESS_IMPRESSIONS_MOBILE_MAPS"] },
  { label: "검색 노출", metrics: ["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH", "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"] },
  { label: "길찾기 요청", metrics: ["BUSINESS_DIRECTION_REQUESTS"] },
  { label: "전화 버튼 클릭", metrics: ["CALL_CLICKS"] },
  { label: "웹사이트 클릭", metrics: ["WEBSITE_CLICKS"] },
] as const;

const performanceResponse = z.object({
  multiDailyMetricTimeSeries: z.array(z.object({
    dailyMetricTimeSeries: z.array(z.object({
      dailyMetric: z.string(),
      timeSeries: z.object({
        datedValues: z.array(z.object({
          date: z.object({ year: z.number().int(), month: z.number().int(), day: z.number().int() }),
          value: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int()).optional(),
        })).default([]),
      }),
    })),
  })).default([]),
});

export function getBusinessProfileConfig() {
  const locationId = process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID?.trim();
  const clientId = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_BUSINESS_PROFILE_REFRESH_TOKEN?.trim();
  if (!locationId || !clientId || !clientSecret || !refreshToken) return null;
  if (!/^\d+$/.test(locationId)) throw new Error("Invalid Business Profile location ID");
  return { locationId, clientId, clientSecret, refreshToken };
}

function offsetDate(date: string, days: number) {
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export async function fetchBusinessProfilePerformance(
  config: NonNullable<ReturnType<typeof getBusinessProfileConfig>>,
  today: string,
) {
  const end = offsetDate(today, -3);
  const start = offsetDate(end, -27);
  const previousEnd = offsetDate(start, -1);
  const previousStart = offsetDate(previousEnd, -27);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error("Business Profile token refresh failed");
  const { access_token: accessToken } = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  const url = new URL(`https://businessprofileperformance.googleapis.com/v1/locations/${config.locationId}:fetchMultiDailyMetricsTimeSeries`);
  for (const group of GROUPS) {
    for (const metric of group.metrics) url.searchParams.append("dailyMetrics", metric);
  }
  for (const [boundary, date] of [["start_date", previousStart], ["end_date", end]]) {
    const [year, month, day] = date.split("-").map(Number);
    for (const [part, value] of Object.entries({ year, month, day })) {
      url.searchParams.set(`dailyRange.${boundary}.${part}`, String(value));
    }
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Business Profile performance request failed");
  const payload = performanceResponse.parse(await response.json());
  const series = new Map(payload.multiDailyMetricTimeSeries.flatMap(group =>
    group.dailyMetricTimeSeries.map(item => [item.dailyMetric, item.timeSeries.datedValues] as const),
  ));

  const metrics = GROUPS.map(({ label, metrics }) => {
    function total(from: string, to: string) {
      let sum = 0;
      for (const metric of metrics) {
        const values = series.get(metric);
        if (!values) return null;
        const window = values.filter(({ date }) => {
          const day = [date.year, String(date.month).padStart(2, "0"), String(date.day).padStart(2, "0")].join("-");
          return day >= from && day <= to;
        });
        if (!window.length) return null;
        for (const { value } of window) sum += value ?? 0;
      }
      return sum;
    }
    return { label, current: total(start, end), previous: total(previousStart, previousEnd) };
  });

  return { configured: true as const, start, end, previousStart, previousEnd, metrics };
}

export type BusinessProfilePerformance =
  | { configured: false }
  | Awaited<ReturnType<typeof fetchBusinessProfilePerformance>>;
