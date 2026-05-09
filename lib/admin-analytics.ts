import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { calcChange } from "./admin-utils";

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";

function getClient(): BetaAnalyticsDataClient {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      const key = JSON.parse(keyJson) as { client_email: string; private_key: string };
      return new BetaAnalyticsDataClient({
        credentials: { client_email: key.client_email, private_key: key.private_key },
      });
    } catch {
      console.error("GOOGLE_SERVICE_ACCOUNT_KEY JSON 파싱 실패. ADC로 폴백합니다.");
    }
  }
  return new BetaAnalyticsDataClient(); // ADC
}

function getPeriodDates(period: string): {
  start: string;
  end: string;
  compareStart: string;
  compareEnd: string;
} {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "180d" ? 180 : 90;

  const endDate = new Date(kstNow);
  endDate.setDate(endDate.getDate() - 1); // yesterday (today's data is incomplete)
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);

  const compareEnd = new Date(startDate);
  compareEnd.setDate(compareEnd.getDate() - 1);
  const compareStart = new Date(compareEnd);
  compareStart.setDate(compareStart.getDate() - days + 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: fmt(startDate),
    end: fmt(endDate),
    compareStart: fmt(compareStart),
    compareEnd: fmt(compareEnd),
  };
}

function buildInListFilter(fieldName: string, values: string[]) {
  return {
    filter: {
      fieldName,
      inListFilter: {
        values,
      },
    },
  };
}

export async function fetchGA4Data(period: string) {
  if (!GA4_PROPERTY_ID) {
    throw new Error("GA4_PROPERTY_ID 환경변수가 설정되지 않았습니다");
  }

  const client = getClient();
  const { start, end, compareStart, compareEnd } = getPeriodDates(period);

  const [currentReport, compareReport, pagesReport, sourcesReport, devicesReport, dailyReport, cityReport, returningReport, hourReport, dayOfWeekReport] =
    await Promise.all([
      // Summary metrics - current period
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      }),
      // Summary metrics - compare period
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: compareStart, endDate: compareEnd }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      }),
      // Top pages
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      // Traffic sources
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      // Device categories
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      // Daily trend
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      }),
      // City
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      // New vs Returning
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "sessions" }],
      }),
      // Hourly pattern
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "hour" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "hour" }, desc: false }],
      }),
      // Day of week pattern
      client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "dayOfWeek" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "dayOfWeek" }, desc: false }],
      }),
    ]);

  const topSourceRows = (sourcesReport[0]?.rows ?? [])
    .map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "(unknown)",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }))
    .filter((row) => row.source && row.sessions > 0);
  const trackedSources = topSourceRows.map((row) => row.source);

  const [sourceSummaryReport, sourceLandingReport, sourceDailyReport, sourceDeviceReport] =
    trackedSources.length > 0
      ? await Promise.all([
        client.runReport({
          property: `properties/${GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "sessionSource" }],
          metrics: [
            { name: "sessions" },
            { name: "engagedSessions" },
            { name: "engagementRate" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
            { name: "screenPageViews" },
          ],
          dimensionFilter: buildInListFilter("sessionSource", trackedSources),
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: trackedSources.length,
        }),
        client.runReport({
          property: `properties/${GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "sessionSource" }, { name: "landingPagePlusQueryString" }],
          metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
          dimensionFilter: buildInListFilter("sessionSource", trackedSources),
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 100,
        }),
        client.runReport({
          property: `properties/${GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "sessionSource" }, { name: "date" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: buildInListFilter("sessionSource", trackedSources),
          orderBys: [
            { dimension: { dimensionName: "sessionSource" }, desc: false },
            { dimension: { dimensionName: "date" }, desc: false },
          ],
          limit: 500,
        }),
        client.runReport({
          property: `properties/${GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: "sessionSource" }, { name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: buildInListFilter("sessionSource", trackedSources),
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 100,
        }),
      ])
      : [null, null, null, null];

  // Parse summary
  const cur = currentReport[0]?.rows?.[0]?.metricValues ?? [];
  const prev = compareReport[0]?.rows?.[0]?.metricValues ?? [];
  const getVal = (arr: typeof cur, i: number) => Number(arr[i]?.value ?? 0);

  const summary = {
    sessions: {
      value: Math.round(getVal(cur, 0)),
      change: calcChange(getVal(cur, 0), getVal(prev, 0)),
    },
    users: {
      value: Math.round(getVal(cur, 1)),
      change: calcChange(getVal(cur, 1), getVal(prev, 1)),
    },
    pageviews: {
      value: Math.round(getVal(cur, 2)),
      change: calcChange(getVal(cur, 2), getVal(prev, 2)),
    },
    avgDuration: {
      value: Math.round(getVal(cur, 3)),
      change: calcChange(getVal(cur, 3), getVal(prev, 3)),
    },
    bounceRate: {
      value: Math.round(getVal(cur, 4) * 10) / 10,
      change: calcChange(getVal(cur, 4), getVal(prev, 4)),
    },
  };

  // Parse top pages (exclude admin/dev paths)
  const EXCLUDED_PREFIXES = ["/admin", "/api/"];
  const topPages = (pagesReport[0]?.rows ?? [])
    .map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      views: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
    .filter((p) => !EXCLUDED_PREFIXES.some((prefix) => p.path.startsWith(prefix)));

  // Parse traffic sources
  const totalSessions = summary.sessions.value || 1;
  const trafficSources = topSourceRows.map((row) => {
    const sessions = row.sessions;
    return {
      source: row.source,
      sessions,
      percentage: Math.round((sessions / totalSessions) * 1000) / 10,
    };
  });

  const sourceDetails = Object.fromEntries(
    trackedSources.map((source) => {
      const summaryRow = (sourceSummaryReport?.[0]?.rows ?? []).find(
        (row) => row.dimensionValues?.[0]?.value === source,
      );
      const sourceSessions = Number(summaryRow?.metricValues?.[0]?.value ?? 0);
      const engagedSessions = Number(summaryRow?.metricValues?.[1]?.value ?? 0);
      const engagementRate = Number(summaryRow?.metricValues?.[2]?.value ?? 0);
      const avgDuration = Number(summaryRow?.metricValues?.[3]?.value ?? 0);
      const bounceRate = Number(summaryRow?.metricValues?.[4]?.value ?? 0);
      const pageviews = Number(summaryRow?.metricValues?.[5]?.value ?? 0);

      const topLandingPages = (sourceLandingReport?.[0]?.rows ?? [])
        .filter((row) => row.dimensionValues?.[0]?.value === source)
        .map((row) => ({
          path: row.dimensionValues?.[1]?.value || "(landing page unknown)",
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
          views: Number(row.metricValues?.[1]?.value ?? 0),
        }))
        .slice(0, 8);

      const dailyTrend = (sourceDailyReport?.[0]?.rows ?? [])
        .filter((row) => row.dimensionValues?.[0]?.value === source)
        .map((row) => {
          const raw = row.dimensionValues?.[1]?.value ?? "";
          const date =
            raw.length === 8
              ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
              : raw;
          return {
            date,
            sessions: Number(row.metricValues?.[0]?.value ?? 0),
            pageviews: 0,
          };
        });

      const devices = (sourceDeviceReport?.[0]?.rows ?? [])
        .filter((row) => row.dimensionValues?.[0]?.value === source)
        .map((row) => {
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          return {
            category: row.dimensionValues?.[1]?.value ?? "unknown",
            sessions,
            percentage:
              sourceSessions > 0
                ? Math.round((sessions / sourceSessions) * 1000) / 10
                : 0,
          };
        });

      return [
        source,
        {
          summary: {
            sessions: sourceSessions,
            engagedSessions,
            engagementRate: Math.round(engagementRate * 1000) / 10,
            avgDuration: Math.round(avgDuration),
            bounceRate: Math.round(bounceRate * 1000) / 10,
            pageviewsPerSession:
              sourceSessions > 0 ? Math.round((pageviews / sourceSessions) * 100) / 100 : 0,
          },
          topLandingPages,
          dailyTrend,
          devices,
        },
      ];
    }),
  );

  // Parse devices
  const devices = (devicesReport[0]?.rows ?? []).map((row) => {
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    return {
      category: row.dimensionValues?.[0]?.value ?? "unknown",
      sessions,
      percentage: Math.round((sessions / totalSessions) * 1000) / 10,
    };
  });

  // Parse daily trend
  const dailyTrend = (dailyReport[0]?.rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value ?? "";
    const date =
      raw.length === 8
        ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
        : raw;
    return {
      date,
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      pageviews: Number(row.metricValues?.[1]?.value ?? 0),
    };
  });

  // Parse city
  const cities = (cityReport[0]?.rows ?? [])
    .map((row) => ({
      city: row.dimensionValues?.[0]?.value ?? "(unknown)",
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
    }))
    .filter((c) => c.city !== "(not set)")
    .map((c) => ({
      ...c,
      percentage: Math.round((c.sessions / totalSessions) * 1000) / 10,
    }));

  // Parse new vs returning
  const returningRaw = returningReport[0]?.rows ?? [];
  const newSessions = Number(
    returningRaw.find((r) => r.dimensionValues?.[0]?.value === "new")?.metricValues?.[0]?.value ?? 0,
  );
  const returningSessions = Number(
    returningRaw.find((r) => r.dimensionValues?.[0]?.value === "returning")?.metricValues?.[0]?.value ?? 0,
  );
  const newVsReturning = [
    { label: "신규", sessions: newSessions, percentage: Math.round((newSessions / totalSessions) * 1000) / 10 },
    { label: "재방문", sessions: returningSessions, percentage: Math.round((returningSessions / totalSessions) * 1000) / 10 },
  ];

  // Parse hourly pattern (GA4 returns "00"~"23" as strings, KST 기준)
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const row of hourReport[0]?.rows ?? []) {
    const h = parseInt(row.dimensionValues?.[0]?.value ?? "0", 10);
    hourlyMap.set(h, Number(row.metricValues?.[0]?.value ?? 0));
  }
  const hourlyPattern = Array.from(hourlyMap.entries()).map(([hour, sessions]) => ({
    hour: `${String(hour).padStart(2, "0")}시`,
    sessions,
  }));

  // Parse day of week (GA4: 0=Sunday, 1=Monday, ..., 6=Saturday)
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  const dowMap = new Map<number, number>();
  for (let d = 0; d < 7; d++) dowMap.set(d, 0);
  for (const row of dayOfWeekReport[0]?.rows ?? []) {
    const d = parseInt(row.dimensionValues?.[0]?.value ?? "0", 10);
    dowMap.set(d, Number(row.metricValues?.[0]?.value ?? 0));
  }
  // 월(1)부터 시작하도록 정렬
  const dowOrder = [1, 2, 3, 4, 5, 6, 0];
  const dowPattern = dowOrder.map((d) => ({
    day: DOW_LABELS[d],
    sessions: dowMap.get(d) ?? 0,
  }));

  return {
    propertyId: GA4_PROPERTY_ID,
    analyticsUrl: `https://analytics.google.com/analytics/web/#/p${GA4_PROPERTY_ID}/reports/intelligenthome`,
    dataAsOf: end,
    period: { start, end },
    comparePeriod: { start: compareStart, end: compareEnd },
    summary,
    topPages,
    trafficSources,
    sourceDetails,
    devices,
    dailyTrend,
    cities,
    newVsReturning,
    hourlyPattern,
    dowPattern,
  };
}

export async function fetchBlogPostGA4Data(period: string) {
  if (!GA4_PROPERTY_ID) {
    throw new Error("GA4_PROPERTY_ID 환경변수가 설정되지 않았습니다");
  }

  const client = getClient();

  // Search Console과 동일한 기간 지원: 28d, 90d, 180d
  const days = period === "90d" ? 90 : period === "180d" ? 180 : 28;
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const endDate = new Date(kstNow);
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const start = fmt(startDate);
  const end = fmt(endDate);

  const [report] = await client.runReport({
    property: `properties/${GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "BEGINS_WITH", value: "/blog/" },
      },
    },
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 100,
  });

  const blogPostStats = (report?.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? "",
    pageViews: Number(row.metricValues?.[0]?.value ?? 0),
    avgDuration: Math.round(Number(row.metricValues?.[1]?.value ?? 0)),
  }));

  return { blogPostStats, dataAsOf: end };
}
