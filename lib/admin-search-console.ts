import type { searchconsole_v1 } from "googleapis";
import { calcChange } from "./admin-utils";
import { BASE_URL } from "./constants";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SEARCH_CONSOLE_READABLE_PERMISSION_LEVELS = new Set([
  "siteOwner",
  "siteFullUser",
  "siteRestrictedUser",
]);

type SearchConsoleSiteEntry = Pick<searchconsole_v1.Schema$WmxSite, "permissionLevel" | "siteUrl">;

type SearchConsoleMetricRow = {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
};

type SearchConsolePageQuery = SearchConsoleMetricRow & {
  query: string;
};

type SearchConsoleQueryPage = SearchConsoleMetricRow & {
  page: string;
};

// Period helper with 3-day offset for SC data delay
function getPeriodDates(period: string) {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(Date.now() + kstOffset);

  const days = period === "7d" ? 7 : period === "28d" ? 28 : period === "90d" ? 90 : 180;
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

function normalizeSiteUrl(siteUrl: string) {
  const trimmed = siteUrl.trim();
  if (trimmed.startsWith("sc-domain:")) {
    return trimmed.toLowerCase();
  }

  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.search = "";
    if (!url.pathname) {
      url.pathname = "/";
    }
    return url.toString();
  } catch {
    return trimmed;
  }
}

function getSiteHost(siteUrl: string) {
  const normalized = normalizeSiteUrl(siteUrl);
  if (normalized.startsWith("sc-domain:")) {
    return normalized.slice("sc-domain:".length);
  }

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function stripLeadingWww(host: string) {
  return host.replace(/^www\./, "");
}

function addSiteCandidate(candidates: string[], seen: Set<string>, siteUrl: string | null | undefined) {
  if (!siteUrl) return;
  const normalized = normalizeSiteUrl(siteUrl);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  candidates.push(normalized);
}

function buildSiteUrlCandidates(configuredSiteUrl: string) {
  const candidates: string[] = [];
  const seen = new Set<string>();

  addSiteCandidate(candidates, seen, configuredSiteUrl);
  addSiteCandidate(candidates, seen, BASE_URL);

  const hosts = new Set<string>();
  for (const siteUrl of [configuredSiteUrl, BASE_URL]) {
    const host = getSiteHost(siteUrl);
    if (!host) continue;

    const baseHost = stripLeadingWww(host);
    hosts.add(host);
    hosts.add(baseHost);
    hosts.add(`www.${baseHost}`);
  }

  for (const host of hosts) {
    addSiteCandidate(candidates, seen, `sc-domain:${stripLeadingWww(host)}`);
    addSiteCandidate(candidates, seen, `https://${host}/`);
    addSiteCandidate(candidates, seen, `http://${host}/`);
  }

  return candidates;
}

function getReadableSites(siteEntries: SearchConsoleSiteEntry[]) {
  return siteEntries.filter((site) =>
    Boolean(site.siteUrl) &&
    Boolean(site.permissionLevel) &&
    SEARCH_CONSOLE_READABLE_PERMISSION_LEVELS.has(site.permissionLevel!),
  );
}

function resolveAccessibleSiteUrl(configuredSiteUrl: string, siteEntries: SearchConsoleSiteEntry[]) {
  const readableSites = getReadableSites(siteEntries);
  if (readableSites.length === 0) {
    return null;
  }

  const readableByNormalizedUrl = new Map(
    readableSites
      .map((site) => site.siteUrl)
      .filter((siteUrl): siteUrl is string => Boolean(siteUrl))
      .map((siteUrl) => [normalizeSiteUrl(siteUrl), siteUrl]),
  );

  for (const candidate of buildSiteUrlCandidates(configuredSiteUrl)) {
    const exactMatch = readableByNormalizedUrl.get(candidate);
    if (exactMatch) {
      return exactMatch;
    }
  }

  const configuredHost = getSiteHost(configuredSiteUrl);
  if (!configuredHost) {
    return readableSites[0]?.siteUrl ?? null;
  }

  const comparableHost = stripLeadingWww(configuredHost);
  const hostMatch = readableSites.find((site) => {
    if (!site.siteUrl) return false;
    const siteHost = getSiteHost(site.siteUrl);
    if (!siteHost) return false;
    return stripLeadingWww(siteHost) === comparableHost;
  });

  return hostMatch?.siteUrl ?? null;
}

function buildPermissionErrorMessage(
  configuredSiteUrl: string,
  actorLabel: string,
  siteEntries: SearchConsoleSiteEntry[],
) {
  const readableSites = getReadableSites(siteEntries)
    .map((site) => site.siteUrl)
    .filter((siteUrl): siteUrl is string => Boolean(siteUrl));

  const accessibleSiteText = readableSites.length > 0
    ? `접근 가능한 속성: ${readableSites.slice(0, 3).join(", ")}`
    : "현재 인증 계정에 Search Console 속성이 연결되어 있지 않습니다.";

  return [
    `Search Console 속성 '${configuredSiteUrl}'에 ${actorLabel} 접근할 수 없습니다.`,
    "Search Console > 설정 > 사용자 및 권한에서 현재 인증 계정에 권한을 추가하거나,",
    "SEARCH_CONSOLE_SITE_URL을 실제로 권한이 있는 도메인 속성 또는 URL-prefix 속성으로 맞춰 주세요.",
    accessibleSiteText,
  ].join(" ");
}

function normalizePagePath(fullUrl: string) {
  try {
    return new URL(fullUrl).pathname;
  } catch {
    return fullUrl;
  }
}

function toMetricRow(row: searchconsole_v1.Schema$ApiDataRow): SearchConsoleMetricRow {
  return {
    impressions: Math.round(row.impressions ?? 0),
    clicks: Math.round(row.clicks ?? 0),
    ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
    position: Math.round((row.position ?? 0) * 10) / 10,
  };
}

export async function fetchSearchConsoleData(period: string) {
  const configuredSiteUrl = process.env.SEARCH_CONSOLE_SITE_URL?.trim();
  if (!configuredSiteUrl) throw new Error("SEARCH_CONSOLE_SITE_URL 환경변수가 설정되지 않았습니다");

  // Dynamic import for cold start optimization
  const { google } = await import("googleapis");

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let auth;
  let actorLabel = "현재 인증 계정이";
  if (keyJson) {
    try {
      const key = JSON.parse(keyJson) as { client_email: string; private_key: string };
      auth = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: [SEARCH_CONSOLE_SCOPE],
      });
      actorLabel = key.client_email ? `서비스 계정(${key.client_email})이` : actorLabel;
    } catch {
      console.error("GOOGLE_SERVICE_ACCOUNT_KEY JSON 파싱 실패. ADC로 폴백합니다.");
    }
  }
  if (!auth) {
    auth = new google.auth.GoogleAuth({
      scopes: [SEARCH_CONSOLE_SCOPE],
    });
  }

  const searchconsole = google.searchconsole({ version: "v1", auth });
  const sitesRes = await searchconsole.sites.list();
  const siteEntries = sitesRes.data.siteEntry ?? [];
  const siteUrl = resolveAccessibleSiteUrl(configuredSiteUrl, siteEntries);

  if (!siteUrl) {
    throw new Error(buildPermissionErrorMessage(configuredSiteUrl, actorLabel, siteEntries));
  }

  const { start, end, compareStart, compareEnd, dataAsOf } = getPeriodDates(period);

  // Parallel API calls: current period, compare period, queries, pages, page-query drilldown
  const [currentRes, compareRes, queriesRes, pagesRes, pageQueryRes] = await Promise.all([
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
        rowLimit: 50,
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
    // Representative queries by page
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["page", "query"],
        rowLimit: 250,
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

  const topQueries = (queriesRes.data.rows ?? [])
    .map((row) => ({
      query: row.keys?.[0] ?? "",
      ...toMetricRow(row),
    }));

  const allPages = (pagesRes.data.rows ?? []).map((row) => {
    const page = normalizePagePath(row.keys?.[0] ?? "");
    return {
      page,
      ...toMetricRow(row),
    };
  });

  const nonBlogPages = allPages.filter((p) => !p.page.startsWith("/blog/"));
  const topPages = nonBlogPages.slice(0, 15);
  const blogPages = allPages.filter((p) => p.page.startsWith("/blog/")).slice(0, 20);
  const trackedPages = new Set([...topPages, ...blogPages].map((page) => page.page));
  const trackedQueries = new Set(topQueries.map((query) => query.query));

  const pageQueryRows = (pageQueryRes.data.rows ?? []).flatMap((row) => {
    const [fullUrl, query = ""] = row.keys ?? [];
    const page = normalizePagePath(fullUrl ?? "");
    if (!page || !query) {
      return [];
    }

    return [{
      page,
      query,
      ...toMetricRow(row),
    }];
  });

  const pageTopQueries = Object.fromEntries(
    Array.from(
      pageQueryRows.reduce((acc, row) => {
        if (!trackedPages.has(row.page)) {
          return acc;
        }

        const list = acc.get(row.page) ?? [];
        list.push({
          query: row.query,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          position: row.position,
        });
        acc.set(row.page, list);
        return acc;
      }, new Map<string, SearchConsolePageQuery[]>()),
    ).map(([page, rows]) => [
      page,
      rows
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, 5),
    ]),
  );

  const queryTopPages = Object.fromEntries(
    Array.from(
      pageQueryRows.reduce((acc, row) => {
        if (!trackedQueries.has(row.query)) {
          return acc;
        }

        const list = acc.get(row.query) ?? [];
        const pageItem: SearchConsoleQueryPage = {
          page: row.page,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          position: row.position,
        };
        list.push(pageItem);
        acc.set(row.query, list);
        return acc;
      }, new Map<string, SearchConsoleQueryPage[]>()),
    ).map(([query, rows]) => [
      query,
      rows
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, 5),
    ]),
  );

  return {
    siteUrl,
    configuredSiteUrl,
    dataAsOf,
    period: { start, end },
    comparePeriod: { start: compareStart, end: compareEnd },
    summary,
    topQueries,
    topPages,
    blogPages,
    pageTopQueries,
    queryTopPages,
  };
}
