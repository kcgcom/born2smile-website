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

for (const width of [360, 390]) {
  test(`${width}px 검색 성과는 화면 안에서 정보·정렬·전체 제목과 수치를 제공한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    const query = "김포 임플란트 수술 후 통증과 식사 주의사항은 언제까지 지켜야 하나요";
    await page.route("**/api/admin/search-console?**", route => route.fulfill({ json: { data: {
      ...search,
      topQueries: [{ query, impressions: 12345, clicks: 345, ctr: 2.8, position: 4.5 }],
      queryTopPages: { [query]: [{ page: "https://www.born2smile.co.kr/", impressions: 12345, clicks: 345, ctr: 2.8, position: 4.5 }] },
    } } }));
    await page.goto("/admin/analysis/search");
    await page.getByText("데이터 정보", { exact: true }).click();
    const info = await page.getByText("속성: sc-domain:born2smile.co.kr", { exact: true }).locator("..").boundingBox();
    expect(info!.x).toBeGreaterThanOrEqual(0);
    expect(info!.x + info!.width).toBeLessThanOrEqual(width);
    const keywords = page.getByRole("region", { name: "상위 검색 키워드", exact: true });
    await keywords.getByRole("button", { name: "상세 보기", exact: true }).click();
    const button = keywords.getByRole("button", { name: query, exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(keywords.getByText("12,345", { exact: true }).filter({ visible: true })).toBeVisible();
    await keywords.getByRole("combobox", { name: "정렬 기준" }).selectOption("clicks");
    await expect(keywords.getByRole("button", { name: "내림차순 ↓" })).toBeVisible();
    await button.click();
    await expect(page.getByRole("heading", { name: new RegExp(query) })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("search-mobile.png"), fullPage: true });
  });

  test(`${width}px 문의 성과는 한국어 제목과 위치별 핵심 수치를 카드로 표시한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.route("**/api/admin/posthog/conversion?**", route => route.fulfill({ json: { data: {
      ...conversion,
      byLocation: [{ ctaLocation: "mobile_sticky_cta", clicks: 120, percentage: 45 }],
      topBlogPosts: [{ slug: post.slug, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      topSharedBlogPosts: [{ slug: post.slug, shareActions: 25, shareVisits: 60, visitRate: 240, copiedShares: 15, nativeShares: 10 }],
    } } }));
    await page.goto("/admin/operations/conversion");
    await expect(page.getByText("모바일 고정 CTA", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("mobile_sticky_cta", { exact: true })).toHaveCount(0);
    const cards = page.getByRole("list", { name: "성과 요약" });
    await expect(cards.filter({ hasText: "1234" }).getByText(post.title, { exact: true })).toBeVisible();
    await expect(cards.filter({ hasText: "2.4회" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("conversion-mobile.png"), fullPage: true });
  });
}

test("모바일 읽기 카드는 표본·반응·문의와 페이지 이동을 유지한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await setup(page);
  const counts = { visits: 3, eligibleVisits: 3, qualified: 2, depth75: 2, time30: 2, feedbackPrompts: 3, solved: 1, unresolved: 1, shares: 1, inquiries: 1 };
  await page.route("**/api/admin/posthog/reading?**", route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    return route.fulfill({ json: { data: {
      configured: true, period: "30d", cursor, nextCursor: cursor ? null : post.slug, pageSize: 25, totalPosts: 26,
      meta: { periodStart: "2026-10-15T15:00:00Z", periodEndExclusive: "2026-11-14T15:00:00Z", fetchedAt: "2026-11-15T00:00:00Z", firstObservedAt: "2026-11-01T00:00:00Z", measurementVersion: "reading-v2", partial: false },
      warnings: [], summary: counts, rows: cursor ? [] : [{ ...counts, slug: post.slug, path }], quality: { invalidEvents: 0, orphanViews: 1, duplicateStarts: 1 },
    } } });
  });
  await page.goto("/admin/analysis/traffic");
  await page.getByRole("tab", { name: "블로그", exact: true }).click();
  const cards = page.getByRole("list", { name: "성과 요약" });
  await expect(cards.getByRole("link", { name: new RegExp(post.title) })).toBeVisible();
  await expect(cards.getByText("표본 부족", { exact: true })).toBeVisible();
  await expect(cards.getByText("문의 연관", { exact: true })).toBeVisible();
  expect(await cards.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "다음 글 목록", exact: true }).click();
  await expect(page.getByRole("button", { name: "다음 글 목록", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "이전 글 목록", exact: true }).click();
  await expect(cards.getByText("표본 부족", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reading-mobile.png"), fullPage: true });
});

test("묶인 키워드는 모바일 카드에서 개별 검색어의 상세로 연결한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  const keywords = [
    { query: "김포 임플란트 비용", impressions: 100, clicks: 5, ctr: 5, position: 4, similarity: 1 },
    { query: "김포 임플란트 보험 적용 비용", impressions: 50, clicks: 2, ctr: 4, position: 6, similarity: 0.8 },
  ];
  await page.route("**/api/admin/search-console?**", route => route.fulfill({ json: { data: {
    ...search, topQueries: keywords,
    semanticClusters: [{ representative: keywords[0].query, keywords, impressions: 150, clicks: 7, ctr: 4.67, position: 5 }],
  } } }));
  await page.goto("/admin/analysis/search");
  const region = page.getByRole("region", { name: "상위 검색 키워드", exact: true });
  await region.getByRole("button", { name: "상세 보기", exact: true }).click();
  await region.locator("summary").filter({ hasText: "묶인 키워드 2개" }).click();
  await region.getByRole("button", { name: keywords[1].query, exact: true }).click();
  await expect(page.getByRole("heading", { name: keywords[1].query, exact: true })).toBeVisible();
});
