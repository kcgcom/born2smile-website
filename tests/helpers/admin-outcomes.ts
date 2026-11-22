import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const metric = { value: 100, change: 5 };
export const path = "/blog/restorative/after-filling-care";
export const post = { slug: "after-filling-care", title: "충치 치료 후 식사 안내", category: "restorative", published: false, date: "", subtitle: "", excerpt: "", tags: [], readTime: "3분" };
const detail = { isBlogAggregate: false, isSectionAggregate: false, aggregateLabel: null, summary: { views: 100, sessions: 80, pageviewsPerSession: 1.25 }, dailyTrend: [], sources: [], topChildPages: [] };
const analytics = { analyticsUrl: "", dataAsOf: "2026-11-06", period: { start: "2026-10-08", end: "2026-11-06" }, comparePeriod: { start: "2026-09-08", end: "2026-10-07" }, summary: { sessions: metric, users: metric, pageviews: metric, avgDuration: metric, bounceRate: { value: 1, change: -5 } }, topPages: [{ path, views: 100, sessions: 80 }], topPageDetails: { [path]: detail }, trafficSources: [], sourceDetails: {}, devices: [], dailyTrend: [], cities: [], newVsReturning: [], hourlyPattern: [], dowPattern: [] };
const row = { impressions: 100, clicks: 5, ctr: 5, position: 6 };
export const search = { siteUrl: "sc-domain:born2smile.co.kr", configuredSiteUrl: "sc-domain:born2smile.co.kr", dataAsOf: "2026-11-09", period: { start: "2026-10-13", end: "2026-11-09" }, comparePeriod: { start: "2026-09-15", end: "2026-10-12" }, summary: { impressions: metric, clicks: metric, ctr: metric, position: { value: 6, change: -5 } }, topPages: [{ page: "https://www.born2smile.co.kr/", ...row }, { page: "http://born2smile.co.kr/", ...row }], blogPages: [{ page: `https://www.born2smile.co.kr${path}`, ...row }], blogSummary: row, topQueries: [], pageTopQueries: {}, queryTopPages: {}, blogQueryTopPages: {}, blogQueryMetrics: {}, sitemap: { status: "healthy", path: "sitemap.xml", lastDownloaded: null, lastSubmitted: null, checkedAt: "2026-11-12T00:00:00Z", warnings: 0, errors: 0, submittedUrlCount: 1 } };
const indexing = { summary: { indexed: 0, needsAttention: 1, failed: 0, unchecked: 0, pendingChanges: 0 }, lastRun: null, events: [], items: [{ url: `https://www.born2smile.co.kr${path}`, path, status: "discovered", coverageState: "Discovered - currently not indexed", canonicalMismatch: false, pendingCount: 0, lastCrawlTime: null, inspectedAt: "2026-11-12T00:00:00Z", error: null }] };
export const conversion = { configured: true, period: "30d", meta: { fetchedAt: "2026-11-12T15:00:00Z", partial: false }, warnings: [], summary: { totalCtaClicks: 28, totalPhoneClicks: 13, contactPageViews: 43, contactToPhoneRate: 11, totalShareActions: 5, totalShareVisits: 11, shareVisitRate: 220, nativeShareActions: 5, copyShareActions: 0 }, byLocation: [], topPages: [], topBlogPosts: [], topSharedBlogPosts: [], shareSources: [] };

export async function setupOutcomes(page: Page) {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!publicUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL이 필요합니다.");
  const cookieName = `sb-${new URL(publicUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(name => {
    const session = { access_token: "test-only-access-token", refresh_token: "test-only-refresh-token", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: { id: "00000000-0000-4000-8000-000000000001", email: "ux-test@example.invalid", app_metadata: {}, user_metadata: {} } };
    const value = `${name}=base64-${btoa(JSON.stringify(session)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { configurable: true, get: () => [cookie.get?.call(document), value].filter(Boolean).join("; "), set: next => { if (!next.startsWith(name)) cookie.set?.call(document, next); } });
    localStorage.setItem("born2smile-admin", "1");
  }, cookieName);
  await page.context().addCookies([{ name: "sb-ui-test-auth-token", value: "test-marker", domain: "localhost", path: "/" }]);
  await page.route("**/*.supabase.co/**", route => route.abort());
  await page.route("**/api/admin/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== "GET") throw new Error("UI 점검은 데이터를 변경하지 않습니다.");
    const end = url.pathname;
    if (end.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access: { isOwner: true, permissions: ["operations", "content", "staff"] } } });
    let data: unknown = {};
    if (end.endsWith("/analytics")) {
      if (url.searchParams.get("period") === "90d") {
        data = { ...analytics, period: { start: "2026-08-15", end: "2026-11-12" }, dataAsOf: "2026-11-12", summary: { ...analytics.summary, sessions: { value: 9000, change: 9 } } };
      } else data = analytics;
    } else if (end.endsWith("/blog-analytics")) data = { blogPostStats: [], dataAsOf: "2026-11-12" };
    else if (end.endsWith("/blog-posts")) data = [post];
    else if (end.endsWith("/search-console")) data = search;
    else if (end.endsWith("/indexing-status")) data = indexing;
    else if (end.endsWith("/conversion")) data = { ...conversion, period: url.searchParams.get("period") ?? "30d" };
    else if (end.endsWith("/health")) data = { summary: { healthy: true, events24h: 201, ctaEvents24h: 5, lastEventAt: null } };
    else if (end.endsWith("/blog-feedback")) data = { feedback: {}, totalResponses: 0 };
    else if (end.endsWith("/schedule")) data = { publishDays: [1, 3, 5] };
    else if (end.endsWith("/hours")) data = { schedule: [], exceptions: [], lunchTime: "", closedDays: "", notice: "" };
    else if (end.endsWith("/search-attention")) data = { configured: true, start: "2026-10-13", end: "2026-11-11", previousStart: "2026-09-13", previousEnd: "2026-10-12", fetchedAt: "2026-11-14T00:00:00Z", truncated: false, items: [] };
    return route.fulfill({ json: { data } });
  });
}
