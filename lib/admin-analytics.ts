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

function normalizeGaDate(raw: string) {
  return raw.length === 8
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    : raw;
}

function createPathAggregate(
  pages: Array<{ path: string; views: number; sessions: number }>,
  aggregatePath: string,
) {
  if (pages.length === 0) return null;

  return {
    path: aggregatePath,
    views: pages.reduce((sum, page) => sum + page.views, 0),
    sessions: pages.reduce((sum, page) => sum + page.sessions, 0),
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
        limit: 100,
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
  const rawTopPages = (pagesReport[0]?.rows ?? [])
    .map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      views: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
    }))
    .filter((p) => !EXCLUDED_PREFIXES.some((prefix) => p.path.startsWith(prefix)));

  const blogPages = rawTopPages.filter((page) => page.path.startsWith("/blog"));
  const treatmentPages = rawTopPages.filter((page) => page.path.startsWith("/treatments"));
  const researchPages = rawTopPages.filter((page) => page.path.startsWith("/research"));
  const nonAggregatePages = rawTopPages.filter(
    (page) =>
      !page.path.startsWith("/blog") &&
      !page.path.startsWith("/treatments") &&
      !page.path.startsWith("/research"),
  );
  const blogAggregate = createPathAggregate(blogPages, "/blog (전체)");
  const treatmentAggregate = createPathAggregate(treatmentPages, "/treatments (전체)");
  const researchAggregate = createPathAggregate(researchPages, "/research (전체)");
  const aggregatePages = [blogAggregate, treatmentAggregate, researchAggregate].filter((page) => page !== null);
  const topPages = [...nonAggregatePages, ...aggregatePages]
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  const trackedPagePaths = Array.from(
    new Set([
      ...nonAggregatePages
        .slice(0, 12)
        .map((page) => page.path)
        .filter((path) => topPages.some((item) => item.path === path)),
      ...blogPages.slice(0, 10).map((page) => page.path),
      ...treatmentPages.slice(0, 10).map((page) => page.path),
      ...researchPages.slice(0, 10).map((page) => page.path),
    ]),
  );

  // Stage 2(페이지 상세) + Stage 3(섹션 집계)를 병렬 실행 — Stage 3은 Stage 2에 의존하지 않음
  const [
    pageDailyReport,
    pageSourceReport,
    blogDailyReport,
    blogSourceReport,
    treatmentDailyReport,
    treatmentSourceReport,
    researchDailyReport,
    researchSourceReport,
  ] = await Promise.all([
    client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: "pagePath" }, { name: "date" }],
      metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
      dimensionFilter: buildInListFilter("pagePath", trackedPagePaths.length > 0 ? trackedPagePaths : ["/"]),
      orderBys: [
        { dimension: { dimensionName: "pagePath" }, desc: false },
        { dimension: { dimensionName: "date" }, desc: false },
      ],
      limit: 1000,
    }),
    client.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: "pagePath" }, { name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      dimensionFilter: buildInListFilter("pagePath", trackedPagePaths.length > 0 ? trackedPagePaths : ["/"]),
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 500,
    }),
    blogAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/blog" },
          },
        },
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      })
      : Promise.resolve(null),
    blogAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/blog" },
          },
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 12,
      })
      : Promise.resolve(null),
    treatmentAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/treatments" },
          },
        },
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      })
      : Promise.resolve(null),
    treatmentAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/treatments" },
          },
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 12,
      })
      : Promise.resolve(null),
    researchAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/research" },
          },
        },
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      })
      : Promise.resolve(null),
    researchAggregate
      ? client.runReport({
        property: `properties/${GA4_PROPERTY_ID}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "BEGINS_WITH", value: "/research" },
          },
        },
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 12,
      })
      : Promise.resolve(null),
  ]);

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

  const detailPages = [
    ...topPages.filter(
      (page) =>
        page.path !== "/blog (전체)" &&
        page.path !== "/treatments (전체)" &&
        page.path !== "/research (전체)",
    ),
    ...blogPages
      .filter((page) => trackedPagePaths.includes(page.path))
      .filter((page) => !topPages.some((item) => item.path === page.path)),
    ...treatmentPages
      .filter((page) => trackedPagePaths.includes(page.path))
      .filter((page) => !topPages.some((item) => item.path === page.path)),
    ...researchPages
      .filter((page) => trackedPagePaths.includes(page.path))
      .filter((page) => !topPages.some((item) => item.path === page.path)),
  ];

  const topPageDetails = Object.fromEntries(
    [
      ...aggregatePages,
      ...detailPages,
    ].map((page) => {
      if (page.path === "/blog (전체)") {
        const dailyTrend = (blogDailyReport?.[0]?.rows ?? []).map((row) => ({
          date: normalizeGaDate(row.dimensionValues?.[0]?.value ?? ""),
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
          pageviews: Number(row.metricValues?.[1]?.value ?? 0),
        }));
        const sources = (blogSourceReport?.[0]?.rows ?? []).map((row) => {
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          return {
            source: row.dimensionValues?.[0]?.value ?? "(unknown)",
            sessions,
            percentage:
              page.sessions > 0 ? Math.round((sessions / page.sessions) * 1000) / 10 : 0,
          };
        });

        return [
          page.path,
          {
            isBlogAggregate: true,
            isSectionAggregate: true,
            aggregateLabel: "블로그 전체",
            summary: {
              views: page.views,
              sessions: page.sessions,
              pageviewsPerSession:
                page.sessions > 0 ? Math.round((page.views / page.sessions) * 100) / 100 : 0,
            },
            dailyTrend,
            sources,
            topChildPages: blogPages
              .sort((a, b) => b.views - a.views)
              .slice(0, 10),
          },
        ];
      }

      if (page.path === "/treatments (전체)") {
        const dailyTrend = (treatmentDailyReport?.[0]?.rows ?? []).map((row) => ({
          date: normalizeGaDate(row.dimensionValues?.[0]?.value ?? ""),
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
          pageviews: Number(row.metricValues?.[1]?.value ?? 0),
        }));
        const sources = (treatmentSourceReport?.[0]?.rows ?? []).map((row) => {
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          return {
            source: row.dimensionValues?.[0]?.value ?? "(unknown)",
            sessions,
            percentage:
              page.sessions > 0 ? Math.round((sessions / page.sessions) * 1000) / 10 : 0,
          };
        });

        return [
          page.path,
          {
            isBlogAggregate: false,
            isSectionAggregate: true,
            aggregateLabel: "치료 페이지 전체",
            summary: {
              views: page.views,
              sessions: page.sessions,
              pageviewsPerSession:
                page.sessions > 0 ? Math.round((page.views / page.sessions) * 100) / 100 : 0,
            },
            dailyTrend,
            sources,
            topChildPages: treatmentPages
              .sort((a, b) => b.views - a.views)
              .slice(0, 10),
          },
        ];
      }

      if (page.path === "/research (전체)") {
        const dailyTrend = (researchDailyReport?.[0]?.rows ?? []).map((row) => ({
          date: normalizeGaDate(row.dimensionValues?.[0]?.value ?? ""),
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
          pageviews: Number(row.metricValues?.[1]?.value ?? 0),
        }));
        const sources = (researchSourceReport?.[0]?.rows ?? []).map((row) => {
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          return {
            source: row.dimensionValues?.[0]?.value ?? "(unknown)",
            sessions,
            percentage:
              page.sessions > 0 ? Math.round((sessions / page.sessions) * 1000) / 10 : 0,
          };
        });

        return [
          page.path,
          {
            isBlogAggregate: false,
            isSectionAggregate: true,
            aggregateLabel: "리서치 전체",
            summary: {
              views: page.views,
              sessions: page.sessions,
              pageviewsPerSession:
                page.sessions > 0 ? Math.round((page.views / page.sessions) * 100) / 100 : 0,
            },
            dailyTrend,
            sources,
            topChildPages: researchPages
              .sort((a, b) => b.views - a.views)
              .slice(0, 10),
          },
        ];
      }

      const dailyTrend = (pageDailyReport[0]?.rows ?? [])
        .filter((row) => row.dimensionValues?.[0]?.value === page.path)
        .map((row) => ({
          date: normalizeGaDate(row.dimensionValues?.[1]?.value ?? ""),
          sessions: Number(row.metricValues?.[0]?.value ?? 0),
          pageviews: Number(row.metricValues?.[1]?.value ?? 0),
        }));
      const sources = (pageSourceReport[0]?.rows ?? [])
        .filter((row) => row.dimensionValues?.[0]?.value === page.path)
        .map((row) => {
          const sessions = Number(row.metricValues?.[0]?.value ?? 0);
          return {
            source: row.dimensionValues?.[1]?.value ?? "(unknown)",
            sessions,
            percentage:
              page.sessions > 0 ? Math.round((sessions / page.sessions) * 1000) / 10 : 0,
          };
        })
        .slice(0, 10);

      return [
        page.path,
        {
          isBlogAggregate: false,
          isSectionAggregate: false,
          aggregateLabel: null,
          summary: {
            views: page.views,
            sessions: page.sessions,
            pageviewsPerSession:
            page.sessions > 0 ? Math.round((page.views / page.sessions) * 100) / 100 : 0,
          },
          dailyTrend,
          sources,
          topChildPages: [],
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
    topPageDetails,
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
