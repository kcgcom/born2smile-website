import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { calcChange } from "./admin-utils";

interface GoogleServiceAccountKey {
  client_email?: string;
  private_key?: string;
  project_id?: string;
  quota_project_id?: string;
}

const DELETED_PROJECT_PATTERN = /Project #?(\d+) has been deleted/i;

function getGa4PropertyId(): string {
  return process.env.GA4_PROPERTY_ID?.trim() ?? "";
}

function parseServiceAccountKey(): GoogleServiceAccountKey | null {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  try {
    return JSON.parse(keyJson) as GoogleServiceAccountKey;
  } catch {
    console.error("GOOGLE_SERVICE_ACCOUNT_KEY JSON 파싱 실패. ADC로 폴백합니다.");
    return null;
  }
}

function getGoogleProjectId(key: GoogleServiceAccountKey | null): string | undefined {
  return (
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    key?.project_id?.trim() ||
    undefined
  );
}

function getGoogleQuotaProjectId(key: GoogleServiceAccountKey | null): string | undefined {
  return process.env.GOOGLE_CLOUD_QUOTA_PROJECT?.trim() || key?.quota_project_id?.trim() || undefined;
}

function getClient(): BetaAnalyticsDataClient {
  const key = parseServiceAccountKey();
  const projectId = getGoogleProjectId(key);
  const quotaProjectId = getGoogleQuotaProjectId(key);

  if (key?.client_email && key.private_key) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: key.client_email,
        private_key: key.private_key,
        ...(projectId ? { project_id: projectId } : {}),
        ...(quotaProjectId ? { quota_project_id: quotaProjectId } : {}),
      },
      ...(projectId ? { projectId } : {}),
    });
  }

  return new BetaAnalyticsDataClient(projectId ? { projectId } : undefined); // ADC
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

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "";
}

export function getGA4ErrorMessage(error: unknown): string {
  const rawMessage = getErrorMessage(error);
  const deletedProjectMatch = rawMessage.match(DELETED_PROJECT_PATTERN);

  if (deletedProjectMatch) {
    return `GA4 인증용 Google Cloud 프로젝트(${deletedProjectMatch[1]})가 삭제되었습니다. Vercel의 GOOGLE_SERVICE_ACCOUNT_KEY를 활성 프로젝트의 서비스 계정 키로 교체하고, 필요하면 GOOGLE_CLOUD_PROJECT/GOOGLE_CLOUD_QUOTA_PROJECT도 함께 갱신하세요.`;
  }

  if (/permission[\s_-]*denied/i.test(rawMessage)) {
    return "GA4 데이터 조회 권한이 없습니다. 서비스 계정에 해당 GA4 속성 조회 권한(Viewer 또는 Analyst)이 있는지 확인하세요.";
  }

  return rawMessage || "Google Analytics 데이터를 불러올 수 없습니다";
}

export async function fetchGA4Data(period: string) {
  const ga4PropertyId = getGa4PropertyId();
  if (!ga4PropertyId) {
    throw new Error("GA4_PROPERTY_ID 환경변수가 설정되지 않았습니다");
  }

  const client = getClient();
  const { start, end, compareStart, compareEnd } = getPeriodDates(period);

  const [currentReport, compareReport, pagesReport, sourcesReport, devicesReport, dailyReport] =
    await Promise.all([
      // Summary metrics - current period
      client.runReport({
        property: `properties/${ga4PropertyId}`,
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
        property: `properties/${ga4PropertyId}`,
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
        property: `properties/${ga4PropertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      // Traffic sources
      client.runReport({
        property: `properties/${ga4PropertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
      // Device categories
      client.runReport({
        property: `properties/${ga4PropertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      // Daily trend
      client.runReport({
        property: `properties/${ga4PropertyId}`,
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      }),
    ]);

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
  const trafficSources = (sourcesReport[0]?.rows ?? []).map((row) => {
    const sessions = Number(row.metricValues?.[0]?.value ?? 0);
    return {
      source: row.dimensionValues?.[0]?.value ?? "(unknown)",
      sessions,
      percentage: Math.round((sessions / totalSessions) * 1000) / 10,
    };
  });

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

  return {
    dataAsOf: end,
    period: { start, end },
    comparePeriod: { start: compareStart, end: compareEnd },
    summary,
    topPages,
    trafficSources,
    devices,
    dailyTrend,
  };
}
