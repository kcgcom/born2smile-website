import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dataAgeDays, formatShareYield } from "../app/admin/(dashboard)/components/analytics-display";
import { getSearchPageIdentity, getSearchPagePath } from "../lib/search-page";

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
    else if (end.endsWith("/blog-likes")) data = { likes: {}, totalLikes: 0 };
    else if (end.endsWith("/schedule")) data = { publishDays: [1, 3, 5] };
    return route.fulfill({ json: { data } });
  });
}

test("기준일은 KST와 실제 지연으로 계산하고 공유량을 전환율로 표현하지 않는다", () => {
  expect(dataAgeDays("2026-11-06", new Date("2026-11-12T15:01:00Z"))).toBe(7);
  expect(dataAgeDays("2026-11-12", new Date("2026-11-12T15:01:00Z"))).toBe(1);
  expect(dataAgeDays("잘못된 날짜")).toBeNull();
  expect(formatShareYield(11, 5)).toBe("2.2회");
  expect(formatShareYield(10, 1)).toBe("10회");
  expect(formatShareYield(11, 0)).toBe("—");
  expect(getSearchPagePath("http://born2smile.co.kr/?a=1")).toBe("/");
  expect(getSearchPageIdentity("http://born2smile.co.kr/")).not.toBe(getSearchPageIdentity("https://www.born2smile.co.kr/"));
  expect(getSearchPageIdentity("https://www.born2smile.co.kr/?ref=one")).toContain("?ref=one");
});

test("기간 전환 중 이전 기간 수치를 숨기고 늦은 응답 후 새 기간을 표시한다", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await setup(page, hold);
  await page.goto("/admin/analysis/traffic");
  await expect(page.getByText("집계 기간: 2026-10-08 ~ 2026-11-06", { exact: true })).toBeVisible();
  await expect(page.getByText(/일반적인 반영 지연보다/)).toBeVisible();
  await page.getByRole("button", { name: "3개월 기간 선택" }).click();
  await expect(page.getByText("집계 기간: 2026-10-08 ~ 2026-11-06", { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText("9,000", { exact: true })).toBeVisible();
  await expect(page.getByText("집계 기간: 2026-08-15 ~ 2026-11-12", { exact: true })).toBeVisible();
});

test("트래픽 탭은 방향키로 이동하고 표의 버튼으로 상세를 열고 복귀한다", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/analysis/traffic");
  const overall = page.getByRole("tab", { name: "전체", exact: true });
  await overall.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "블로그", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "traffic-tab-blog");
  await page.keyboard.press("Home");
  await expect(overall).toBeFocused();
  await page.getByText("수치 및 상세 표 보기", { exact: true }).first().click();
  const opener = page.getByRole("button", { name: `${path} 상세 보기`, exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("검색 성과는 한글 제목과 원본 URL을 표시하고 정렬 방향을 제공한다", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/analysis/search");
  await expect(page.getByRole("button", { name: post.title, exact: true })).toBeVisible();
  await expect(page.getByText(/페이지��/)).toHaveCount(0);
  await page.getByRole("region").filter({ has: page.getByRole("heading", { name: "일반 페이지별 검색 성과", exact: true }) }).getByRole("button", { name: "상세 보기", exact: true }).click();
  await expect(page.getByRole("button", { name: "홈페이지 https://www.born2smile.co.kr/", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "홈페이지 http://born2smile.co.kr/", exact: true })).toBeVisible();
  await expect(page.getByLabel("5% 감소 · 낮을수록 좋음")).toHaveText("▼ 5%");
});

test("개요에서 확인 필요와 초안을 안내하고 초안 목록으로 연결한다", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/operations/overview");
  await expect(page.getByText(/확인 필요 1개 · 검사 실패 0개/)).toBeVisible();
  await expect(page.getByText(/미발행 초안 1건/)).toBeVisible();
  await page.getByRole("link", { name: "초안 검토하기", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "상태 필터" })).toHaveValue("draft");
});

test("모바일은 메뉴를 압축하고 검색과 목록을 차트보다 먼저 제공한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/content/posts");
  const filters = page.getByRole("heading", { name: "목록 필터", exact: true });
  await expect(filters).toBeVisible();
  const filterY = await filters.evaluate(node => node.getBoundingClientRect().top + window.scrollY);
  expect(filterY).toBeLessThan(1000);
  const distribution = page.getByText("카테고리별 분포 보기", { exact: true });
  expect(await distribution.evaluate(node => node.getBoundingClientRect().top + window.scrollY)).toBeGreaterThan(filterY);
  expect(await page.getByRole("navigation", { name: "관리자 워크스페이스" }).evaluate(node => node.getBoundingClientRect().height)).toBeLessThan(70);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-posts.png") });
  const active = page.getByRole("navigation", { name: "콘텐츠 세부 화면" }).getByRole("link", { name: "포스트", exact: true });
  expect(await active.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);
  const ratio = await active.evaluate(node => {
    const style = getComputedStyle(node), canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const luminance = (color: string) => { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const values = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; };
    const fg = luminance(style.color), bg = luminance(style.backgroundColor); return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("모바일 색인은 카드에서 상태와 시각을 함께 보고 빈 결과에서 복구한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/analysis/indexing");
  const cards = page.getByRole("list", { name: "색인 URL 요약" });
  await expect(cards).toBeVisible();
  await expect(cards.getByText("검사 시각", { exact: true })).toBeVisible();
  await expect(cards.getByText("발견됨", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await cards.screenshot({ path: testInfo.outputPath("mobile-indexing.png") });
  await page.getByRole("searchbox", { name: "URL 검색" }).fill("no-matching-url");
  await page.getByRole("button", { name: "전체 URL 보기", exact: true }).click();
  await expect(cards.getByText("발견됨", { exact: true })).toBeVisible();
});

test("공유 성과는 퍼센트 대신 공유당 유입 횟수와 이벤트 정의를 표시한다", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/operations/conversion");
  await expect(page.getByText("2.2회", { exact: true })).toBeVisible();
  await expect(page.getByText("공유 1회당 유입", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/방문자 수나 전환율이 아니며/)).toBeVisible();
  await expect(page.getByText("220%", { exact: true })).toHaveCount(0);
});
