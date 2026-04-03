import { BASE_URL } from "@/lib/constants";

export const POSTHOG_CTA_EVENTS = [
  "hero_contact_click",
  "hero_phone_click",
  "cta_contact_click",
  "cta_phone_click",
  "contact_phone_click",
  "contact_kakao_click",
  "header_phone_click",
  "floating_phone_click",
  "floating_contact_nav_click",
] as const;

export const POSTHOG_PHONE_EVENTS = [
  "hero_phone_click",
  "cta_phone_click",
  "contact_phone_click",
  "header_phone_click",
  "floating_phone_click",
] as const;

export const POSTHOG_CONTACT_EVENTS = [
  "hero_contact_click",
  "cta_contact_click",
  "floating_contact_nav_click",
  "contact_kakao_click",
] as const;

export const POSTHOG_PERIODS = ["7d", "30d", "90d"] as const;

export type PostHogPeriod = (typeof POSTHOG_PERIODS)[number];

export interface PostHogHealthData {
  env: {
    tokenConfigured: boolean;
    hostConfigured: boolean;
    projectIdConfigured: boolean;
    apiKeyConfigured: boolean;
  };
  summary: {
    events24h: number | null;
    ctaEvents24h: number | null;
    lastEventAt: string | null;
    healthy: boolean;
  };
  links: {
    overview: string | null;
    events: string | null;
    insights: string | null;
    funnels: string | null;
  };
}

export interface ConversionData {
  configured: boolean;
  period: PostHogPeriod;
  summary: {
    totalCtaClicks: number;
    totalPhoneClicks: number;
    totalContactClicks: number;
    contactPageViews: number;
    contactToPhoneRate: number | null;
  };
  byLocation: Array<{
    ctaLocation: string;
    clicks: number;
    percentage: number;
  }>;
  topPages: Array<{
    pagePath: string;
    totalClicks: number;
    phoneClicks: number;
    contactClicks: number;
  }>;
  topBlogPosts: Array<{
    slug: string;
    totalClicks: number;
    phoneClicks: number;
    contactClicks: number;
  }>;
}

interface PostHogConfig {
  token: string | null;
  host: string | null;
  projectId: string | null;
  apiKey: string | null;
  baseUrl: string | null;
}

interface PostHogQueryResponse {
  columns?: string[];
  results?: unknown[];
}

const PERIOD_TO_DAYS: Record<PostHogPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function getPostHogConfig(): PostHogConfig {
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim() || null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || null;
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim() || null;
  const apiKey = process.env.POSTHOG_API_KEY?.trim() || null;
  const baseUrl =
    process.env.POSTHOG_BASE_URL?.trim() ||
    (host ? derivePrivateBaseUrl(host) : null);

  return {
    token,
    host,
    projectId,
    apiKey,
    baseUrl,
  };
}

function derivePrivateBaseUrl(publicHost: string): string {
  if (publicHost.includes("us.i.posthog.com")) return "https://us.posthog.com";
  if (publicHost.includes("eu.i.posthog.com")) return "https://eu.posthog.com";
  return publicHost.replace(".i.", ".");
}

function quoteSql(value: string): string {
  return `'${value.replaceAll("'", "\\'")}'`;
}

function sqlList(values: readonly string[]): string {
  return `(${values.map(quoteSql).join(", ")})`;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRows(payload: PostHogQueryResponse): Array<Record<string, unknown>> {
  const results = Array.isArray(payload.results) ? payload.results : [];
  if (results.length === 0) return [];

  const first = results[0];
  if (Array.isArray(first)) {
    const columns = Array.isArray(payload.columns)
      ? payload.columns
      : first.map((_, index) => `column_${index}`);
    return results.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column, (row as unknown[])[index]]))
    );
  }

  if (typeof first === "object" && first !== null) {
    return results as Array<Record<string, unknown>>;
  }

  return [];
}

async function queryPostHog(sql: string, name: string): Promise<Array<Record<string, unknown>>> {
  const config = getPostHogConfig();
  if (!config.projectId || !config.apiKey || !config.baseUrl) {
    throw new Error("PostHog 조회용 환경변수가 설정되지 않았습니다");
  }

  const response = await fetch(`${config.baseUrl}/api/projects/${config.projectId}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query: sql,
      },
      name,
      refresh: "blocking",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `PostHog API 요청 실패 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  const payload = (await response.json()) as PostHogQueryResponse;
  return normalizeRows(payload);
}

function buildLinks(config: PostHogConfig) {
  if (!config.baseUrl || !config.projectId) {
    return {
      overview: config.baseUrl,
      events: null,
      insights: null,
      funnels: null,
    };
  }

  const projectBase = `${config.baseUrl.replace(/\/$/, "")}/project/${config.projectId}`;
  return {
    overview: projectBase,
    events: `${projectBase}/events`,
    insights: `${projectBase}/insights`,
    funnels: `${projectBase}/insights?insight=Funnels`,
  };
}

export function getPostHogEnvStatus() {
  const config = getPostHogConfig();
  return {
    tokenConfigured: Boolean(config.token),
    hostConfigured: Boolean(config.host),
    projectIdConfigured: Boolean(config.projectId),
    apiKeyConfigured: Boolean(config.apiKey),
    baseUrlConfigured: Boolean(config.baseUrl),
    links: buildLinks(config),
  };
}

export async function fetchPostHogHealth(): Promise<PostHogHealthData> {
  const env = getPostHogEnvStatus();

  if (!env.projectIdConfigured || !env.apiKeyConfigured || !env.baseUrlConfigured) {
    return {
      env: {
        tokenConfigured: env.tokenConfigured,
        hostConfigured: env.hostConfigured,
        projectIdConfigured: env.projectIdConfigured,
        apiKeyConfigured: env.apiKeyConfigured,
      },
      summary: {
        events24h: null,
        ctaEvents24h: null,
        lastEventAt: null,
        healthy: false,
      },
      links: env.links,
    };
  }

  const [row = {}] = await queryPostHog(
    `
      SELECT
        count() AS events_24h,
        countIf(event IN ${sqlList(POSTHOG_CTA_EVENTS)}) AS cta_events_24h,
        max(timestamp) AS last_event_at
      FROM events
      WHERE timestamp >= now() - INTERVAL 1 DAY
    `,
    "admin_posthog_health_24h"
  );

  const events24h = toNumber(row.events_24h);
  const ctaEvents24h = toNumber(row.cta_events_24h);
  const lastEventAt =
    typeof row.last_event_at === "string" && row.last_event_at.trim()
      ? row.last_event_at
      : null;

  return {
    env: {
      tokenConfigured: env.tokenConfigured,
      hostConfigured: env.hostConfigured,
      projectIdConfigured: env.projectIdConfigured,
      apiKeyConfigured: env.apiKeyConfigured,
    },
    summary: {
      events24h,
      ctaEvents24h,
      lastEventAt,
      healthy: events24h > 0,
    },
    links: env.links,
  };
}

export async function fetchPostHogConversion(period: PostHogPeriod): Promise<ConversionData> {
  const env = getPostHogEnvStatus();

  if (!env.projectIdConfigured || !env.apiKeyConfigured || !env.baseUrlConfigured) {
    return {
      configured: false,
      period,
      summary: {
        totalCtaClicks: 0,
        totalPhoneClicks: 0,
        totalContactClicks: 0,
        contactPageViews: 0,
        contactToPhoneRate: null,
      },
      byLocation: [],
      topPages: [],
      topBlogPosts: [],
    };
  }

  const days = PERIOD_TO_DAYS[period];
  const intervalClause = `timestamp >= now() - INTERVAL ${days} DAY`;

  const [summaryRows, locationRows, pageRows, blogRows] = await Promise.all([
    queryPostHog(
      `
        SELECT
          countIf(event IN ${sqlList(POSTHOG_CTA_EVENTS)}) AS total_cta_clicks,
          countIf(event IN ${sqlList(POSTHOG_PHONE_EVENTS)}) AS total_phone_clicks,
          countIf(event IN ${sqlList(POSTHOG_CONTACT_EVENTS)}) AS total_contact_clicks,
          countIf(event = '$pageview' AND properties.$pathname = '/contact') AS contact_page_views,
          countIf(event = 'contact_phone_click') AS contact_phone_clicks
        FROM events
        WHERE ${intervalClause}
      `,
      `admin_posthog_conversion_summary_${period}`
    ),
    queryPostHog(
      `
        SELECT
          ifNull(properties.cta_location, '(unknown)') AS cta_location,
          count() AS clicks
        FROM events
        WHERE ${intervalClause}
          AND event IN ${sqlList(POSTHOG_CTA_EVENTS)}
        GROUP BY cta_location
        ORDER BY clicks DESC
        LIMIT 20
      `,
      `admin_posthog_conversion_locations_${period}`
    ),
    queryPostHog(
      `
        SELECT
          ifNull(properties.page_path, '(unknown)') AS page_path,
          count() AS total_clicks,
          countIf(event IN ${sqlList(POSTHOG_PHONE_EVENTS)}) AS phone_clicks,
          countIf(event IN ${sqlList(POSTHOG_CONTACT_EVENTS)}) AS contact_clicks
        FROM events
        WHERE ${intervalClause}
          AND event IN ${sqlList(POSTHOG_CTA_EVENTS)}
        GROUP BY page_path
        ORDER BY total_clicks DESC
        LIMIT 10
      `,
      `admin_posthog_conversion_pages_${period}`
    ),
    queryPostHog(
      `
        SELECT
          properties.slug AS slug,
          count() AS total_clicks,
          countIf(event IN ${sqlList(POSTHOG_PHONE_EVENTS)}) AS phone_clicks,
          countIf(event IN ${sqlList(POSTHOG_CONTACT_EVENTS)}) AS contact_clicks
        FROM events
        WHERE ${intervalClause}
          AND event IN ${sqlList(POSTHOG_CTA_EVENTS)}
          AND properties.page_type = 'blog_post'
          AND properties.slug IS NOT NULL
        GROUP BY slug
        ORDER BY total_clicks DESC
        LIMIT 10
      `,
      `admin_posthog_conversion_blog_${period}`
    ),
  ]);

  const summaryRow = summaryRows[0] ?? {};
  const totalCtaClicks = toNumber(summaryRow.total_cta_clicks);
  const totalPhoneClicks = toNumber(summaryRow.total_phone_clicks);
  const totalContactClicks = toNumber(summaryRow.total_contact_clicks);
  const contactPageViews = toNumber(summaryRow.contact_page_views);
  const contactPhoneClicks = toNumber(summaryRow.contact_phone_clicks);

  return {
    configured: true,
    period,
    summary: {
      totalCtaClicks,
      totalPhoneClicks,
      totalContactClicks,
      contactPageViews,
      contactToPhoneRate:
        contactPageViews > 0
          ? Math.round((contactPhoneClicks / contactPageViews) * 1000) / 10
          : null,
    },
    byLocation: locationRows.map((row) => {
      const clicks = toNumber(row.clicks);
      return {
        ctaLocation: String(row.cta_location ?? "(unknown)"),
        clicks,
        percentage:
          totalCtaClicks > 0
            ? Math.round((clicks / totalCtaClicks) * 1000) / 10
            : 0,
      };
    }),
    topPages: pageRows.map((row) => ({
      pagePath: String(row.page_path ?? "(unknown)"),
      totalClicks: toNumber(row.total_clicks),
      phoneClicks: toNumber(row.phone_clicks),
      contactClicks: toNumber(row.contact_clicks),
    })),
    topBlogPosts: blogRows.map((row) => ({
      slug: String(row.slug ?? "(unknown)"),
      totalClicks: toNumber(row.total_clicks),
      phoneClicks: toNumber(row.phone_clicks),
      contactClicks: toNumber(row.contact_clicks),
    })),
  };
}

export function getPostHogPublicUrl(): string {
  return getPostHogConfig().baseUrl ?? BASE_URL;
}
