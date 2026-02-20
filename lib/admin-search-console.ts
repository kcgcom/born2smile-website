// Period helper with 3-day offset for SC data delay
function getPeriodDates(period: string) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);

  const days = period === "7d" ? 7 : period === "28d" ? 28 : 90;
  const DELAY_DAYS = 3; // SC data is delayed 2-3 days

  const endDate = new Date(kstNow);
  endDate.setDate(endDate.getDate() - DELAY_DAYS);
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
    dataAsOf: fmt(endDate),
  };
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function fetchSearchConsoleData(period: string) {
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) throw new Error("SEARCH_CONSOLE_SITE_URL 환경변수가 설정되지 않았습니다");

  // Dynamic import for cold start optimization
  const { google } = await import("googleapis");

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let auth;
  if (keyJson) {
    const key = JSON.parse(keyJson) as { client_email: string; private_key: string };
    auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
  }

  const searchconsole = google.searchconsole({ version: "v1", auth });
  const { start, end, compareStart, compareEnd, dataAsOf } = getPeriodDates(period);

  // Parallel API calls: current period, compare period, queries, pages
  const [currentRes, compareRes, queriesRes, pagesRes] = await Promise.all([
    // Summary - current
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: start, endDate: end, dimensions: [], rowLimit: 1 },
    }),
    // Summary - compare
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: compareStart, endDate: compareEnd, dimensions: [], rowLimit: 1 },
    }),
    // Top queries
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["query"],
        rowLimit: 15,
        dataState: "final",
      },
    }),
    // Top pages
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["page"],
        rowLimit: 25, // extra to filter blog pages
        dataState: "final",
      },
    }),
  ]);

  const curRow = currentRes.data.rows?.[0];
  const prevRow = compareRes.data.rows?.[0];

  const summary = {
    impressions: {
      value: Math.round(curRow?.impressions ?? 0),
      change: calcChange(curRow?.impressions ?? 0, prevRow?.impressions ?? 0),
    },
    clicks: {
      value: Math.round(curRow?.clicks ?? 0),
      change: calcChange(curRow?.clicks ?? 0, prevRow?.clicks ?? 0),
    },
    ctr: {
      value: Math.round((curRow?.ctr ?? 0) * 1000) / 10,
      change: calcChange(curRow?.ctr ?? 0, prevRow?.ctr ?? 0),
    },
    position: {
      value: Math.round((curRow?.position ?? 0) * 10) / 10,
      change: calcChange(curRow?.position ?? 0, prevRow?.position ?? 0),
    },
  };

  const topQueries = (queriesRes.data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? "",
    impressions: Math.round(row.impressions ?? 0),
    clicks: Math.round(row.clicks ?? 0),
    ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
    position: Math.round((row.position ?? 0) * 10) / 10,
  }));

  const allPages = (pagesRes.data.rows ?? []).map((row) => {
    const fullUrl = row.keys?.[0] ?? "";
    let page = fullUrl;
    try {
      page = new URL(fullUrl).pathname;
    } catch {
      // Keep as-is if not a valid URL
    }
    return {
      page,
      impressions: Math.round(row.impressions ?? 0),
      clicks: Math.round(row.clicks ?? 0),
      ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
      position: Math.round((row.position ?? 0) * 10) / 10,
    };
  });

  const topPages = allPages.slice(0, 15);
  const blogPages = allPages.filter((p) => p.page.startsWith("/blog/")).slice(0, 20);

  return {
    dataAsOf,
    period: { start, end },
    comparePeriod: { start: compareStart, end: compareEnd },
    summary,
    topQueries,
    topPages,
    blogPages,
  };
}
