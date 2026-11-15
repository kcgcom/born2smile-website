import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const metric = { value: 100, change: 5 };
const path = "/blog/restorative/after-filling-care";
const post = { slug: "after-filling-care", title: "충치 치료 후 식사 안내", category: "restorative", published: false, date: "", subtitle: "", excerpt: "", tags: [], readTime: "3분" };
const detail = { isBlogAggregate: false, isSectionAggregate: false, aggregateLabel: null, summary: { views: 100, sessions: 80, pageviewsPerSession: 1.25 }, dailyTrend: [], sources: [], topChildPages: [] };
const analytics = { analyticsUrl: "", dataAsOf: "2026-11-06", period: { start: "2026-10-08", end: "2026-11-06" }, comparePeriod: { start: "2026-09-08", end: "2026-10-07" }, summary: { sessions: metric, users: metric, pageviews: metric, avgDuration: metric, bounceRate: { value: 1, change: -5 } }, topPages: [{ path, views: 100, sessions: 80 }], topPageDetails: { [path]: detail }, trafficSources: [], sourceDetails: {}, devices: [], dailyTrend: [], cities: [], newVsReturning: [], hourlyPattern: [], dowPattern: [] };
const row = { impressions: 100, clicks: 5, ctr: 5, position: 6 };
const search = { siteUrl: "sc-domain:born2smile.co.kr", configuredSiteUrl: "sc-domain:born2smile.co.kr", dataAsOf: "2026-11-09", period: { start: "2026-10-13", end: "2026-11-09" }, comparePeriod: { start: "2026-09-15", end: "2026-10-12" }, summary: { impressions: metric, clicks: metric, ctr: metric, position: { value: 6, change: -5 } }, topPages: [{ page: "https://www.born2smile.co.kr/", ...row }, { page: "http://born2smile.co.kr/", ...row }], blogPages: [{ page: `https://www.born2smile.co.kr${path}`, ...row }], blogSummary: row, topQueries: [], pageTopQueries: {}, queryTopPages: {}, blogQueryTopPages: {}, blogQueryMetrics: {}, sitemap: { status: "healthy", path: "sitemap.xml", lastDownloaded: null, lastSubmitted: null, checkedAt: "2026-11-12T00:00:00Z", warnings: 0, errors: 0, submittedUrlCount: 1 } };
const indexing = { summary: { indexed: 0, needsAttention: 1, failed: 0, unchecked: 0, pendingChanges: 0 }, lastRun: null, events: [], items: [{ url: `https://www.born2smile.co.kr${path}`, path, status: "discovered", coverageState: "Discovered - currently not indexed", canonicalMismatch: false, pendingCount: 0, lastCrawlTime: null, inspectedAt: "2026-11-12T00:00:00Z", error: null }] };
const conversion = { configured: true, period: "30d", meta: { fetchedAt: "2026-11-12T15:00:00Z", partial: false }, warnings: [], summary: { totalCtaClicks: 28, totalPhoneClicks: 13, contactPageViews: 43, contactToPhoneRate: 11, totalShareActions: 5, totalShareVisits: 11, shareVisitRate: 220, nativeShareActions: 5, copyShareActions: 0 }, byLocation: [], topPages: [], topBlogPosts: [], topSharedBlogPosts: [], shareSources: [] };

async function setup(page: Page, hold90?: Promise<void>) {
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
    if (end.endsWith("auth-check")) return route.fulfill({ json: { ok: true } });
    let data: unknown = {};
    if (end.endsWith("/analytics")) {
      if (url.searchParams.get("period") === "90d") {
        if (hold90) await hold90;
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

for (const width of [1280, 1440]) {
  test(`${width}px 검색 팝업·조회 도구·정렬 조작이 읽기 쉬운 크기를 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto("/admin/analysis/search");
    await expect(page.getByText("집계 기간:", { exact: false })).toBeVisible();
    const toolbar = page.getByRole("region", { name: "리포트 조회 도구", exact: true });
    expect((await toolbar.boundingBox())!.height).toBeLessThan(120);
    await toolbar.getByText("데이터 정보", { exact: true }).click();
    const info = await page.getByText("속성: sc-domain:born2smile.co.kr", { exact: true }).locator("..").boundingBox();
    expect(info!.width).toBeGreaterThanOrEqual(300);
    expect(info!.x).toBeGreaterThanOrEqual(0);
    expect(info!.x + info!.width).toBeLessThanOrEqual(width);
    const region = page.getByRole("region", { name: "일반 페이지별 검색 성과", exact: true });
    await region.getByRole("button", { name: "상세 보기", exact: true }).click();
    const sort = region.getByRole("button", { name: "클릭", exact: false });
    expect((await sort.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sort.click();
    await expect(region.getByRole("columnheader", { name: "클릭", exact: false })).toHaveAttribute("aria-sort", "descending");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("search-desktop.png"), fullPage: true });
  });

  test(`${width}px 문의·공유 상세 표는 두 열로 비교하고 수치를 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.route("**/api/admin/posthog/conversion?**", route => route.fulfill({ json: { data: {
      ...conversion,
      byLocation: [{ ctaLocation: "header_desktop", clicks: 120, percentage: 45 }],
      topPages: [{ pagePath: path, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      topBlogPosts: [{ slug: post.slug, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      shareSources: [{ shareSource: "mobile_sticky_cta", shareActions: 25, shareVisits: 60, visitRate: 240 }],
      topSharedBlogPosts: [{ slug: post.slug, shareActions: 25, shareVisits: 60, visitRate: 240, copiedShares: 15, nativeShares: 10 }],
    } } }));
    await page.goto("/admin/operations/conversion");
    const left = await page.getByRole("heading", { name: "공유 버튼 위치별 성과", exact: true }).boundingBox();
    const right = await page.getByRole("heading", { name: "CTA 위치별 성과", exact: true }).boundingBox();
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(5);
    expect(right!.x).toBeGreaterThan(left!.x + 200);
    const tables = page.getByRole("table");
    await expect(tables.filter({ hasText: "PC 상단 문의" })).toBeVisible();
    await expect(tables.filter({ hasText: "공유 위치" })).toContainText("2.4회");
    await expect(tables.filter({ hasText: "총 클릭" })).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath("conversion-desktop.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("방문 차트는 한국어 페이지명과 원본 상세 연결을 유지하고 빈 블로그 영역을 축약한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page);
  await page.goto("/admin/analysis/traffic");
  const chart = page.getByRole("img", { name: "주요 페이지·섹션 차트 · 아래 표에서 수치와 상세를 확인할 수 있습니다.", exact: true });
  await expect(chart.getByText(post.title, { exact: true })).toBeVisible();
  await page.getByText("수치 및 상세 표 보기", { exact: true }).first().click();
  const opener = page.getByRole("button", { name: path + " 상세 보기", exact: true });
  await expect(opener).toHaveText(post.title);
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.getByRole("tab", { name: "블로그", exact: true }).click();
  for (const title of ["글별 방문 성과", "유입 구조"]) {
    const card = page.getByRole("heading", { name: title, exact: true }).locator("..");
    await expect(card).toContainText("선택 기간의 데이터가 없습니다.");
    expect((await card.boundingBox())!.height).toBeLessThan(130);
  }
  await page.screenshot({ path: testInfo.outputPath("reading-desktop.png"), fullPage: true });
});

test("데스크톱 색인 표는 한국어 설명과 Google 원문을 함께 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setup(page);
  await page.goto("/admin/analysis/indexing");
  const table = page.getByRole("table");
  await expect(table.getByText("Google이 URL을 발견했지만 아직 검색 색인에 등록하지 않았습니다.", { exact: true })).toBeVisible();
  await table.getByText("Google 원문 사유", { exact: true }).click();
  await expect(table.getByText("Discovered - currently not indexed", { exact: true })).toBeVisible();
});
