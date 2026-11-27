import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dataAgeDays, formatShareYield } from "../app/admin/(dashboard)/components/analytics-display";
import { getSearchPageIdentity, getSearchPagePath } from "../lib/search-page";
import { readingPeriodRange, type ReadingReport } from "../lib/blog/reading-report";
import { performanceRange, type PostPerformance } from "../lib/post-performance";
import { overviewContent, searchReviewCandidates } from "../lib/admin-overview";
import { performanceSource } from "../lib/admin-post-performance";
import { OWNER_ACCESS, type AdminAccess } from "../lib/admin-access";

const metric = { value: 100, change: 5 };
const path = "/blog/restorative/after-filling-care";
const post = { slug: "after-filling-care", title: "충치 치료 후 식사 안내", category: "restorative", published: false, date: "", subtitle: "", excerpt: "", tags: [], readTime: "3분" };
const detail = { isBlogAggregate: false, isSectionAggregate: false, aggregateLabel: null, summary: { views: 100, sessions: 80, pageviewsPerSession: 1.25 }, dailyTrend: [], sources: [], topChildPages: [] };
const analytics = { analyticsUrl: "", dataAsOf: "2026-11-06", period: { start: "2026-10-08", end: "2026-11-06" }, comparePeriod: { start: "2026-09-08", end: "2026-10-07" }, summary: { sessions: metric, users: metric, pageviews: metric, avgDuration: metric, bounceRate: { value: 1, change: -5 } }, topPages: [{ path, views: 100, sessions: 80 }], topPageDetails: { [path]: detail }, trafficSources: [], sourceDetails: {}, devices: [], dailyTrend: [], cities: [], newVsReturning: [], hourlyPattern: [], dowPattern: [] };
const row = { impressions: 100, clicks: 5, ctr: 5, position: 6 };
const search = { siteUrl: "sc-domain:born2smile.co.kr", configuredSiteUrl: "sc-domain:born2smile.co.kr", dataAsOf: "2026-11-09", period: { start: "2026-10-11", end: "2026-11-09" }, comparePeriod: { start: "2026-09-11", end: "2026-10-10" }, summary: { impressions: metric, clicks: metric, ctr: metric, position: { value: 6, change: -5 } }, topPages: [{ page: "https://www.born2smile.co.kr/", ...row }, { page: "http://born2smile.co.kr/", ...row }], blogPages: [{ page: `https://www.born2smile.co.kr${path}`, ...row }], blogSummary: row, topQueries: [], pageTopQueries: {}, queryTopPages: {}, blogQueryTopPages: {}, blogQueryMetrics: {}, sitemap: { status: "healthy", path: "sitemap.xml", lastDownloaded: null, lastSubmitted: null, checkedAt: "2026-11-12T00:00:00Z", warnings: 0, errors: 0, submittedUrlCount: 1 } };
const indexing = { summary: { indexed: 0, needsAttention: 1, failed: 0, unchecked: 0, pendingChanges: 0 }, lastRun: null, events: [], items: [{ url: `https://www.born2smile.co.kr${path}`, path, status: "discovered", coverageState: "Discovered - currently not indexed", canonicalMismatch: false, pendingCount: 0, lastCrawlTime: null, inspectedAt: "2026-11-12T00:00:00Z", error: null }] };
const conversion = { configured: true, period: "30d", meta: { fetchedAt: "2026-11-12T15:00:00Z", partial: false }, warnings: [], summary: { totalCtaClicks: 28, totalPhoneClicks: 13, contactPageViews: 43, contactToPhoneRate: 11, totalShareActions: 5, totalShareVisits: 11, shareVisitRate: 220, nativeShareActions: 5, copyShareActions: 0 }, byLocation: [], topPages: [], topBlogPosts: [], topSharedBlogPosts: [], shareSources: [] };

async function setup(page: Page, hold90?: Promise<void>, access: AdminAccess = OWNER_ACCESS) {
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
    if (end.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access } });
    let data: unknown = {};
    if (end.endsWith("/analytics")) {
      if (url.searchParams.get("period") === "90d") {
        if (hold90) await hold90;
        data = { ...analytics, period: { start: "2026-08-15", end: "2026-11-12" }, dataAsOf: "2026-11-12", summary: { ...analytics.summary, sessions: { value: 9000, change: 9 } } };
      } else data = analytics;
    } else if (end.endsWith("/blog-analytics")) data = { blogPostStats: [], dataAsOf: "2026-11-12" };
    else if (end.endsWith("/blog-posts")) data = [post];
    else if (end.endsWith("/content-revisions")) data = [];
    else if (end.endsWith("/content-planner")) data = [];
    else if (end.endsWith("/publication-review")) data = { drafts: [], revisions: [] };
    else if (end.endsWith("/blog-cards")) data = {
      configured: true, period: url.searchParams.get("period"),
      range: readingPeriodRange("30d", new Date("2026-11-14T07:00:00Z")), impressions: 24, clicks: 0,
    };
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

test("사이트맵 동기화 보류와 최근 색인 검사 결과를 구분해 표시한다", async ({ page }) => {
  await setup(page);
  await page.route("**/api/admin-presence", route => route.fulfill({ status: 204 }));
  await page.route("**/api/admin/indexing-status", route => route.fulfill({ json: { data: {
    ...indexing,
    summary: { ...indexing.summary, total: 1 },
    lastRun: { status: "completed", processed: 1, succeeded: 1, failed: 0, completedAt: null, error: null },
    sitemapHold: { reason: "url_mismatch", differences: 2, since: null },
  } } }));
  await page.goto("/admin/analysis/indexing");
  const hold = page.getByRole("status").filter({ hasText: "사이트맵 목록 동기화 보류" });
  await expect(hold).toContainText("공개 사이트맵과 기준 목록의 차이 2개");
  await expect(hold).toContainText("마지막으로 확인한 URL 목록을 사용합니다.");
  await expect(page.getByText(/최근 작업.*성공 1개/)).toBeVisible();
});

for (const workspace of ["admin", "staff"] as const) {
  test(`${workspace} 치료 후 안내에서 공개 글을 검색하고 환자용 링크를 복사한다`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page, undefined, workspace === "admin" ? OWNER_ACCESS : { isOwner: false });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const published = { ...post, title: "발치 후 안내", slug: "after-tooth-extraction-care", published: true, date: "2025-01-01", tags: ["치료후관리"] };
    await page.route(url => url.pathname === "/api/admin/blog-posts", route => route.fulfill({ json: { data: [
      published,
      { ...published, slug: "implant-care", title: "임플란트 수술 후 안내" },
      { ...published, slug: "other-guide", title: "다른 주제 안내", tags: ["증상가이드", "기존 태그"] },
      { ...published, slug: "scheduled", title: "예약 글", date: "2099-01-01" },
      { ...published, slug: "draft", title: "초안 글", published: false, tags: [] },
    ] } }));
    const listResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/blog-posts");
    await page.goto(workspace === "staff"
      ? `/staff/posts?status=draft&performance=${published.slug}`
      : "/admin/content/posts");
    expect(new URL((await listResponse).url()).searchParams.get("status")).toBe(workspace === "staff" ? "published" : null);
    await expect(page.getByRole("button", { name: "치료 후 안내", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "환자용 링크 복사" })).toHaveCount(3);
    await page.getByRole("button", { name: /^필터/ }).click();
    const tag = page.getByRole("combobox", { name: "태그 필터" });
    await tag.selectOption({ label: "치료 후 관리" });
    const status = page.getByRole("combobox", { name: "상태 필터" });
    if (workspace === "admin") {
      await status.selectOption("published");
    } else {
      await expect(status).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: "환자용 링크 복사" })).toHaveCount(2);
    await expect(page.getByRole("link", { name: /다른 주제 안내|예약 글|초안 글/ })).toHaveCount(0);
    await page.getByRole("searchbox", { name: "제목 검색" }).fill("발치");
    const copy = page.getByRole("button", { name: "환자용 링크 복사" });
    await expect(copy).toHaveCount(1);
    const row = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "발치 후 안내", exact: true }) });
    await page.setViewportSize({ width: 1440, height: 900 });
    const performance = row.getByRole("button", { name: "발치 후 안내 성과 보기", exact: true });
    if (workspace === "admin") await expect(performance).toBeVisible();
    if (workspace === "staff") {
      await expect(performance).toHaveCount(0);
      await expect(page.getByRole("dialog", { name: "발치 후 안내 성과", exact: true })).toHaveCount(0);
      await expect(copy.getByText("환자용 링크 복사", { exact: true })).toBeVisible();
      for (const width of [414, 390, 360, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await expect(copy.getByText("링크 복사", { exact: true })).toBeVisible();
        const actions = row.getByRole("button");
        await expect(actions).toHaveCount(3);
        const boxes = await actions.evaluateAll(buttons => buttons.map(button => {
          const { x, y, width, height } = button.getBoundingClientRect();
          return { x, y, width, height };
        }));
        const card = (await row.boundingBox())!;
        for (const box of boxes) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.y).toBe(boxes[0].y);
          expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width);
        }
      }
    }
    await copy.scrollIntoViewIfNeeded();
    const beforeCopy = await copy.boundingBox();
    const rowBefore = await row.boundingBox();
    await copy.click();
    const completed = page.getByRole("button", { name: "복사 완료!", exact: true });
    const publicUrl = "https://www.born2smile.co.kr/blog/restorative/after-tooth-extraction-care";
    await expect(completed).toHaveAttribute("title", publicUrl);
    await expect(row.getByText(publicUrl, { exact: true })).toHaveCount(0);
    await expect(completed.locator("..").getByRole("status")).toHaveText("환자용 링크를 복사했습니다.");
    const buttonBox = await completed.boundingBox();
    const rowAfter = await row.boundingBox();
    expect(beforeCopy).not.toBeNull();
    expect(buttonBox).not.toBeNull();
    expect(rowAfter?.height).toBe(rowBefore?.height);
    expect(Math.abs(beforeCopy!.x - buttonBox!.x)).toBeLessThan(1);
    expect(Math.abs(beforeCopy!.y - buttonBox!.y)).toBeLessThan(1);
    expect(buttonBox!.width).toBe(beforeCopy!.width);
    expect(buttonBox!.height).toBe(beforeCopy!.height);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(publicUrl);
    await page.setViewportSize({ width: 390, height: 844 });

    await expect(tag).toHaveValue("치료후관리");
    await tag.selectOption("기존 태그");
    await page.getByRole("searchbox", { name: "제목 검색" }).fill("다른");
    await expect(page.getByRole("link", { name: "다른 주제 안내" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: "다른 주제 안내" })).toBeVisible();
    await page.getByRole("button", { name: /^필터/ }).click();
    await expect(tag).toHaveValue("기존 태그");
    await page.getByRole("button", { name: "초기화", exact: true }).click();
    await expect(tag).toHaveValue("");
    if (workspace === "admin") {
      await expect(page.getByRole("link", { name: "초안 글" })).toBeVisible();
    } else {
      await expect(page.getByRole("link", { name: /예약 글|초안 글/ })).toHaveCount(0);
    }
    await expect(tag.locator('optgroup[label="분류 상태"] option')).toHaveText("미분류");
    await tag.selectOption({ label: "미분류" });
    await expect(page.getByRole("button", { name: "미분류", exact: true })).toBeVisible();
    if (workspace === "admin") {
      await expect(page.getByRole("link", { name: "초안 글" })).toBeVisible();
    } else {
      await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /발치 후 안내|임플란트 수술 후 안내|다른 주제 안내|예약 글/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "환자용 링크 복사" })).toHaveCount(0);
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

test("새 읽기 리포트는 표본·오류·기간을 구분하고 세션 시간 순위를 없앤다", async ({ page }) => {
  await setup(page);
  const counts = { visits: 3, eligibleVisits: 3, qualified: 2, depth75: 2, time30: 2, feedbackPrompts: 3, solved: 1, unresolved: 1, shares: 1, inquiries: 1 };
  const report: ReadingReport = {
    configured: true, period: "30d", cursor: null, nextCursor: "after-filling-care", pageSize: 25, totalPosts: 26,
    meta: { ...readingPeriodRange("30d", new Date("2026-11-14T07:00:00Z")), fetchedAt: "2026-11-14T07:00:00Z", firstObservedAt: "2026-11-01T00:00:00Z", partial: false },
    warnings: [], summary: counts, rows: [{ ...counts, slug: post.slug, path }], quality: { invalidEvents: 0, orphanViews: 1, duplicateStarts: 1 },
  };
  await page.route("**/api/admin/posthog/reading?*", route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("period") === "90d") return route.fulfill({ status: 500, json: { message: "읽기 조회 테스트 오류" } });
    return route.fulfill({ json: { data: params.has("cursor") ? { ...report, cursor: params.get("cursor"), nextCursor: null, rows: [] } : report } });
  });
  await page.goto("/admin/analysis/traffic?view=blog");
  await expect(page.getByRole("tab", { name: "블로그", exact: true })).toHaveAttribute("aria-selected", "true");
  const cards = page.getByRole("heading", { name: "블로그 카드 노출·클릭 · PostHog" }).locator("..");
  await expect(cards.getByText("24건", { exact: true })).toBeVisible();
  await expect(cards.getByText("0건", { exact: true })).toBeVisible();
  await expect(page.getByText("유효 읽기율 (추정)", { exact: true })).toBeVisible();
  await expect(page.getByText("표본 부족", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/시작 없는 view 1건/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "오래 읽힌 글", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "다음 글 목록" }).click();
  await expect(page.getByRole("button", { name: "다음 글 목록" })).toBeDisabled();
  await page.getByRole("button", { name: "이전 글 목록" }).click();
  await expect(page.getByText("표본 부족", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "90일 기간 선택" }).click();
  await expect(page.getByText("읽기 조회 테스트 오류", { exact: true })).toBeVisible();
  await expect(page.getByText("표본 부족", { exact: true })).toHaveCount(0);
});

test("전체 읽기 리포트는 수집 품질이 늦어도 읽기 요약과 글별 목록을 먼저 표시한다", async ({ page }) => {
  await setup(page);
  const meta = readingPeriodRange("30d", new Date("2026-11-14T07:00:00Z"));
  await page.addInitScript(({ meta, path, slug }) => {
    const originalFetch = window.fetch.bind(window);
    let releaseQuality = () => {};
    Object.assign(window, { releaseReadingQuality: () => releaseQuality() });
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (url.pathname !== "/api/admin/posthog/reading" || new Headers(init?.headers).get("accept") !== "application/x-ndjson") {
        return originalFetch(input, init);
      }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          const summary = { visits: 4, eligibleVisits: 4, qualified: 3, depth75: 3, time30: 3, feedbackPrompts: 0, solved: 0, unresolved: 0, shares: 0, inquiries: 0 };
          send({ update: { configured: true, cursor: null, period: "30d", pageSize: 25, meta } });
          send({ update: { summary, totalPosts: 1 } });
          send({ update: { rows: [{ ...summary, path, slug }], nextCursor: null } });
          releaseQuality = () => {
            send({ update: { quality: { invalidEvents: 0, orphanViews: 2, duplicateStarts: 1 } } });
            send({ done: true });
            controller.close();
          };
        },
      });
      return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
    };
  }, { meta, path, slug: post.slug });
  await page.goto("/admin/analysis/traffic?view=blog");
  const reading = page.getByRole("heading", { name: "본문 읽기와 독자 반응 · PostHog" }).locator("..");
  await expect(reading.getByText("75.0%", { exact: true }).first()).toBeVisible();
  await expect(reading.getByRole("link", { name: new RegExp(post.title) }).filter({ visible: true })).toBeVisible();
  await expect(reading.getByText("수집 품질을 확인하는 중…")).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseReadingQuality(): void }).releaseReadingQuality());
  await expect(reading.getByText(/시작 없는 view 2건/)).toBeVisible();
});

test("기간 전환 중 이전 기간 수치를 숨기고 늦은 응답 후 새 기간을 표시한다", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await setup(page, hold);
  await page.goto("/admin/analysis/traffic");
  await expect(page.getByText("집계 기간: 2026-10-08 ~ 2026-11-06", { exact: true })).toBeVisible();
  await expect(page.getByText("데이터 반영 지연 · 기준일 확인 필요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "90일 기간 선택" }).click();
  await expect(page.getByText("집계 기간: 2026-10-08 ~ 2026-11-06", { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByText("9,000", { exact: true })).toBeVisible();
  await expect(page.getByText("집계 기간: 2026-08-15 ~ 2026-11-12", { exact: true })).toBeVisible();
  const searchRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get("period") === "90d"
    && new URL(request.url()).pathname.endsWith("/search-console"));
  await page.getByRole("navigation", { name: "운영 세부 화면" }).getByRole("link", { name: "검색 성과" }).click();
  await searchRequest;
  await expect(page.getByRole("button", { name: "90일 기간 선택" })).toHaveAttribute("aria-pressed", "true");
});

for (const width of [360, 390]) {
  test(`${width}px 관리자 메뉴는 모든 하위 화면을 가리지 않고 터치 영역을 확보한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    for (const [path, name] of [["/admin/content/posts", "콘텐츠"], ["/admin/analysis/search", "운영"]]) {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: `${name} 세부 화면`, exact: true });
      if (name === "운영") {
        const label = nav.getByRole("link", { name: "오늘 할 일" }).locator("span");
        expect((await label.boundingBox())!.height).toBeLessThanOrEqual(20);
      }
      for (const link of await nav.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      expect((await nav.boundingBox())!.y).toBeLessThan(180);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
}

test("성과 기준일은 바로 보이고 화면별 해석 도움말은 펼쳐 확인한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/analysis/traffic");
  await expect(page.getByText("집계 기간: 2026-10-08 ~ 2026-11-06", { exact: true })).toBeVisible();
  await expect(page.getByText("직전 기간: 2026-09-08 ~ 2026-10-07", { exact: true })).toBeVisible();
  await expect(page.getByText(/증감률은 직전 기간/)).toBeHidden();
  await page.getByText("집계·해석 기준", { exact: true }).click();
  await expect(page.getByText(/증감률은 직전 기간/)).toBeVisible();
  await expect(page.getByText(/CTR의 %p/)).toHaveCount(0);
  await page.goto("/admin/analysis/search");
  await expect(page.getByText(/CTR의 %p/)).toBeHidden();
  await page.getByText("집계·해석 기준", { exact: true }).click();
  await expect(page.getByText(/CTR의 %p/)).toBeVisible();
});

test("모바일 일정은 예약을 먼저 표시하고 문의 성과는 정상 계측 상세보다 먼저 표시한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/content/schedule");
  const schedule = await page.getByRole("heading", { name: "일정 현황", exact: true }).boundingBox();
  const policy = await page.getByRole("heading", { name: "발행 요일 정책", exact: true }).boundingBox();
  expect(schedule!.y).toBeLessThan(policy!.y);
  await page.goto("/admin/operations/conversion");
  const health = page.locator("details").filter({ has: page.locator("summary", { hasText: "계측 상태" }) });
  await expect(health).not.toHaveAttribute("open", "");
  await expect(page.getByText("24시간 이벤트", { exact: true })).toBeHidden();
  expect((await page.getByText("30일 전화 클릭", { exact: true }).boundingBox())!.y).toBeLessThan((await health.boundingBox())!.y);
  await health.locator("summary").click();
  await expect(page.getByText("24시간 이벤트", { exact: true })).toBeVisible();
});

test("방문 분석은 기본 집계 표시 후 블로그 GA4와 카드 성과를 미리 조회하고 탭 전환 시 재사용한다", async ({ page }) => {
  await setup(page);
  const requests: string[] = [];
  let releaseBasic!: () => void;
  const basicResponse = new Promise<void>(resolve => { releaseBasic = resolve; });
  let releaseBlog!: () => void;
  const blogResponse = new Promise<void>(resolve => { releaseBlog = resolve; });
  await page.route("**/api/admin/analytics?*", async route => {
    const basic = new URL(route.request().url()).searchParams.get("scope") === "basic";
    requests.push(basic ? "basic" : "full");
    if (basic) await basicResponse;
    await route.fulfill({ json: { data: analytics } });
  });
  await page.route("**/api/admin/blog-analytics?*", async route => {
    await blogResponse;
    await route.fulfill({ json: { data: { blogPostStats: [], dataAsOf: analytics.dataAsOf } } });
  });
  await page.route("**/api/admin/posthog/blog-cards?*", async route => {
    await blogResponse;
    const period = new URL(route.request().url()).searchParams.get("period");
    const range = readingPeriodRange("30d", new Date("2026-11-14T07:00:00Z"));
    await route.fulfill({ json: { data: { configured: true, period, range, impressions: 24, clicks: 3 } } });
  });
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/blog-analytics") || path.includes("/posthog/")) requests.push(path);
  });
  await page.goto("/admin/analysis/traffic");
  await expect.poll(() => requests).toEqual(["basic"]);
  releaseBasic();
  await expect.poll(() => [...requests].sort()).toEqual([
    "/api/admin/blog-analytics",
    "/api/admin/posthog/blog-cards",
    "basic",
    "full",
  ]);
  await page.getByRole("tab", { name: "블로그", exact: true }).click();
  await expect.poll(() => [...requests].sort()).toEqual([
    "/api/admin/blog-analytics",
    "/api/admin/posthog/blog-cards",
    "/api/admin/posthog/conversion",
    "/api/admin/posthog/reading",
    "basic",
    "full",
  ]);
  releaseBlog();
  await expect(page.getByText("24건", { exact: true })).toBeVisible();
  expect(requests.filter(path => path === "/api/admin/posthog/blog-cards")).toHaveLength(1);
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

test("개요는 검토 후보를 오류와 구분하고 초안 목록으로 연결한다", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/operations/overview");
  await expect(page.getByText(/색인 확인 필요 1개/)).toBeVisible();
  await expect(page.getByText("조회된 자료에서 즉시 처리할 오류는 없습니다.", { exact: true })).toBeVisible();
  await expect(page.getByText(/미발행 초안 1건/)).toBeVisible();
  await page.getByRole("link", { name: "초안 검토하기", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "상태 필터" })).toHaveValue("draft");
});

test("개요 검토 기준과 공통 날짜 범위는 표본·예약·KST 경계를 구분한다", async () => {
  const rows = [
    { ...post, slug: "published", published: true, date: "2026-11-01" },
    { ...post, slug: "small-sample", published: true, date: "2026-11-01" },
    { ...post, slug: "tomorrow", published: true, date: "2026-11-15" },
    { ...post, slug: "later", published: true, date: "2026-11-29" },
    { ...post, slug: "draft", published: false, date: "" },
  ];
  const model = overviewContent(rows, {
    published: { solved: 2, unresolved: 3, total: 5 },
    "small-sample": { solved: 0, unresolved: 2, total: 2 },
    draft: { solved: 0, unresolved: 8, total: 8 },
  }, "2026-11-14");
  expect(model.review.map(item => item.slug)).toEqual(["published"]);
  expect(model.scheduled.map(item => item.slug)).toEqual(["tomorrow"]);
  expect(model.drafts.map(item => item.slug)).toEqual(["draft"]);
  const range = performanceRange("30d", new Date("2026-11-13T15:01:00Z"));
  expect(range.start).toBe("2026-10-13");
  expect(range.end).toBe("2026-11-11");
  expect(range.periodEndExclusive).toBe("2026-11-11T15:00:00.000Z");
  let called = false;
  expect((await performanceSource(false, "검색", async () => { called = true; return 0; })).status).toBe("unconfigured");
  expect(called).toBe(false);
  expect((await performanceSource(true, "검색", async () => { throw new Error("provider unavailable"); })).status).toBe("error");
  expect(await performanceSource(true, "검색", async () => ({ clicks: 0 }))).toEqual({ status: "ready", data: { clicks: 0 } });
  const changes = searchReviewCandidates([
    { page: "known", clicks: 12, impressions: 100 }, { page: "small", clicks: 1, impressions: 20 },
  ], [
    { page: "known", clicks: 20, impressions: 150 }, { page: "small", clicks: 3, impressions: 20 },
    { page: "absent-in-current", clicks: 100, impressions: 1000 },
  ]);
  expect(changes).toEqual([{ page: "known", clicks: 12, previousClicks: 20, drop: 8, changePercent: -40 }]);
});

test("포스트 성과 API는 비인증 조회를 차단한다", async ({ request }) => {
  const result = await request.get(`/api/admin/blog-posts/${post.slug}/performance?period=30d`, {
    headers: { Accept: "application/x-ndjson" },
  });
  expect(result.status()).toBe(401);
});

test("포스트 성과는 한 요청에서 먼저 도착한 지표를 표시하고 실패한 출처만 다시 조회한다", async ({ page }) => {
  await setup(page);
  const now = new Date("2026-11-14T00:00:00Z");
  await page.clock.setFixedTime(now);
  const published = { ...post, category: "restorative" as const, date: "2026-11-01", published: true };
  await page.route("**/api/admin/blog-posts", route => route.fulfill({ json: { data: [published] } }));
  await page.addInitScript(({ published, range, fetchedAt }) => {
    const originalFetch = window.fetch.bind(window);
    const sources: string[] = [];
    let release = () => {};
    Object.assign(window, { performanceSources: sources, releasePerformance: () => release() });
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (!url.pathname.endsWith("/performance") || new Headers(init?.headers).get("accept") !== "application/x-ndjson") {
        return originalFetch(input, init);
      }
      const source = url.searchParams.get("source");
      sources.push(source ?? "all");
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          const finish = () => { send({ done: true }); controller.close(); };
          send({ update: { post: published, period: "30d", range } });
          if (source === "search") {
            send({ update: { search: { status: "ready", data: { clicks: 7, impressions: 11, queries: [], queriesAvailable: true } }, sourceTimes: { search: fetchedAt } } });
            finish();
            return;
          }
          send({ update: { feedback: { status: "ready", data: { solved: 2, unresolved: 3, total: 5 } }, sourceTimes: { feedback: fetchedAt } } });
          send({ update: { reading: { status: "ready", data: { counts: { eligibleVisits: 4, qualified: 2, shares: 1, inquiries: 0 } } } } });
          release = () => {
            send({ update: { search: { status: "error", data: null, message: "검색 데이터를 불러오지 못했습니다." } } });
            send({ update: { traffic: { status: "ready", data: { views: 42, sessions: 30, timeZone: "Asia/Seoul" } } } });
            send({ update: { readingFirstObserved: { status: "ready", data: { firstObservedAt: null } } } });
            finish();
          };
        },
      });
      return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
    };
  }, { published, range: performanceRange("30d", now), fetchedAt: now.toISOString() });
  await page.goto("/admin/content/posts");
  await page.getByRole("button", { name: `${post.title} 성과 보기`, exact: true }).click();
  const panel = page.getByRole("dialog", { name: `${post.title} 성과`, exact: true });
  await expect(panel.getByText("5건", { exact: true })).toBeVisible();
  const reading = panel.getByRole("region", { name: "읽기·후속 행동 · PostHog" });
  await expect(reading.getByText("50.0%", { exact: true })).toBeVisible();
  await expect(reading.getByText("읽기 수집 시작 시각 확인 중…")).toBeVisible();
  await expect(panel.getByText("42회", { exact: true })).toHaveCount(0);
  await expect(panel.getByRole("region", { name: "방문 · GA4" }).getByText("불러오는 중…")).toBeVisible();
  await page.evaluate(() => (window as unknown as { releasePerformance(): void }).releasePerformance());
  await expect(panel.getByText("42회", { exact: true })).toBeVisible();
  await expect(reading.getByText("이 글의 읽기 측정 전 또는 수집 미확인입니다.")).toBeVisible();
  await panel.getByRole("button", { name: "검색 유입 · Search Console 다시 조회" }).click();
  await expect(panel.getByText("7회", { exact: true })).toBeVisible();
  await expect(panel.getByText("5건", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { performanceSources: string[] }).performanceSources)).toEqual(["all", "search"]);
});

test("포스트 성과는 선택한 글만 조회하고 오류·누적 응답·기간 전환을 구분한다", async ({ page }, testInfo) => {
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-11-14T09:00:00+09:00"));
  const published = { ...post, category: "restorative" as const, date: "2026-11-01", published: true };
  await page.route("**/api/admin/blog-posts", route => route.fulfill({ json: { data: [published] } }));
  const response: PostPerformance = {
    post: { ...published, dateModified: null, updatedAt: "2026-11-01T00:00:00Z" }, path, period: "30d",
    range: performanceRange("30d", new Date("2026-11-14T00:00:00Z")), fetchedAt: "2026-11-14T00:00:00Z", partial: true,
    feedback: { status: "ready", data: { solved: 2, unresolved: 3, total: 5 } },
    search: { status: "error", data: null, message: "검색 데이터를 불러오지 못했습니다." },
    traffic: { status: "ready", data: { views: 42, sessions: 30, timeZone: "Asia/Seoul", thresholded: false } },
    reading: { status: "ready", data: { counts: { visits: 4, eligibleVisits: 4, qualified: 2, depth75: 2, time30: 2, feedbackPrompts: 2, solved: 1, unresolved: 1, shares: 1, inquiries: 0 }, firstObservedAt: "2026-11-01T00:00:00Z", warnings: [] } },
  };
  let requests = 0;
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/admin/blog-posts/*/performance?*", async route => {
    requests++;
    const period = new URL(route.request().url()).searchParams.get("period");
    if (period === "90d") await hold;
    return route.fulfill({ json: { data: period === "90d" ? { ...response, period, range: performanceRange("90d", new Date("2026-11-14T00:00:00Z")), traffic: { status: "ready", data: { views: 900, sessions: 600, timeZone: "Asia/Seoul", thresholded: false } } } : response } });
  });
  await page.goto("/admin/content/posts");
  const opener = page.getByRole("button", { name: `${post.title} 성과 보기`, exact: true });
  await expect(opener).toBeVisible();
  expect(requests).toBe(0);
  await opener.click();
  const panel = page.getByRole("dialog", { name: `${post.title} 성과`, exact: true });
  await expect(panel.getByText("42회", { exact: true })).toBeVisible();
  await expect(panel.getByText("40.0%", { exact: true })).toBeVisible();
  await expect(panel.getByText("검색 데이터를 불러오지 못했습니다.", { exact: true })).toBeVisible();
  await expect(panel.getByText(/읽기 표본 부족/)).toBeVisible();
  await panel.getByRole("combobox", { name: "포스트 성과 조회 기간" }).selectOption("90d");
  await expect(panel.getByText("42회", { exact: true })).toHaveCount(0);
  release();
  await expect(panel.getByText("900회", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await panel.screenshot({ path: testInfo.outputPath("post-performance-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("초안 성과 패널은 외부 성과 조회 없이 공개 전 상태를 안내한다", async ({ page }) => {
  await setup(page);
  let requests = 0;
  await page.route("**/api/admin/blog-posts/*/performance?*", route => { requests++; return route.fulfill({ json: {} }); });
  await page.goto(`/admin/content/posts?performance=${post.slug}`);
  const panel = page.getByRole("dialog", { name: `${post.title} 성과`, exact: true });
  await expect(panel.getByText(/공개 발행 후 성과를 확인/)).toBeVisible();
  expect(requests).toBe(0);
  await expect(panel.getByRole("link", { name: "미리보기 열기" })).toHaveAttribute("href", `/admin/preview/${post.category}/${post.slug}`);
  await panel.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page).not.toHaveURL(/performance=/);
});

test("운영 개요는 반복 미해결과 가까운 일정만 보여주고 조회 실패를 0으로 감추지 않는다", async ({ page }, testInfo) => {
  await setup(page);
  await page.clock.setFixedTime(new Date("2026-11-14T09:00:00+09:00"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/admin/blog-posts", route => route.fulfill({ json: { data: [
    { ...post, published: true, date: "2026-11-01" },
    { ...post, slug: "scheduled", title: "곧 발행할 글", published: true, date: "2026-11-16" },
  ] } }));
  await page.route("**/api/admin/blog-feedback", route => route.fulfill({ json: { data: { feedback: { [post.slug]: { solved: 2, unresolved: 3, total: 5 } }, totalResponses: 5 } } }));
  await page.route("**/api/admin/search-attention", route => route.fulfill({ json: { data: { configured: true, start: "2026-10-13", end: "2026-11-11", previousStart: "2026-09-13", previousEnd: "2026-10-12", truncated: false, items: [{ page: `https://www.born2smile.co.kr${path}`, clicks: 12, previousClicks: 20, drop: 8, changePercent: -40 }] } } }));
  await page.route("**/api/admin/site-config/hours", route => route.fulfill({ status: 503, json: { message: "진료시간 조회 테스트 오류" } }));
  await page.route("**/api/admin/business-profile", route => route.fulfill({ json: { data: {
    configured: true,
    start: "2026-10-15",
    end: "2026-11-11",
    previousStart: "2026-09-17",
    previousEnd: "2026-10-14",
    metrics: [
      { label: "지도 노출", current: 1234, previous: 1000 },
      { label: "전화 버튼 클릭", current: 0, previous: null },
    ],
  } } }));
  await page.goto("/admin/operations/overview");
  await expect(page.getByRole("heading", { name: "오늘 할 일", exact: true })).toBeVisible();
  await expect(page.getByText("진료시간 조회 테스트 오류", { exact: true })).toBeVisible();
  await expect(page.getByText("조회된 자료에서 즉시 처리할 오류는 없습니다.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("총 응답 5건 · 해결 2 · 미해결 3", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "근거와 성과 보기" })).toHaveAttribute("href", `/admin/content/posts?performance=${post.slug}`);
  await expect(page.getByRole("link", { name: "곧 발행할 글", exact: true })).toBeVisible();
  await page.getByText("상세 분석으로 이동", { exact: true }).click();
  const shortcuts = page.getByRole("navigation", { name: "자주 보는 성과" });
  await expect(shortcuts.getByRole("link", { name: "모바일 문의 버튼" })).toHaveAttribute("href", "/admin/operations/conversion?location=mobile");
  await expect(shortcuts.getByRole("link", { name: "진료 페이지 방문" })).toHaveAttribute("href", "/admin/analysis/traffic?section=treatments");
  await expect(page.getByText("검색 클릭 20 → 12회 (-40%)", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "검색과 글 성과 보기" })).toHaveAttribute(
    "href", `/admin/content/posts?performance=${post.slug}&performanceEnd=2026-11-11`,
  );
  await expect(page.getByRole("heading", { name: "구글 지도·병원 프로필" })).toBeVisible();
  await expect(page.getByText("1,234", { exact: true })).toBeVisible();
  await expect(page.getByText("직전 1,000 · 증감 +234", { exact: true })).toBeVisible();
  await expect(page.getByText("직전 데이터 없음", { exact: true })).toBeVisible();
  await page.route("**/api/admin/site-config/hours", route => route.fulfill({ json: { data: { schedule: [], notice: "", exceptions: [
    { date: "2026-11-13", open: false, time: "", note: "지난 휴진" },
    { date: "2026-11-16", open: false, time: "", note: "가까운 휴진" },
    { date: "2026-12-20", open: false, time: "", note: "먼 휴진" },
  ] } } }));
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByText("가까운 휴진", { exact: true })).toBeVisible();
  await expect(page.getByText("지난 휴진", { exact: true })).toHaveCount(0);
  await expect(page.getByText("먼 휴진", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("operations-overview-mobile.png"), fullPage: true });
  await page.route("**/api/admin/blog-posts/*/performance?*", route => {
    const end = new URL(route.request().url()).searchParams.get("end");
    expect(end).toBe("2026-11-11");
    const unconfigured = { status: "unconfigured", data: null, message: "연결 필요" } as const;
    return route.fulfill({ json: { data: {
      post: { ...post, published: true, date: "2026-11-01" },
      period: "30d",
      range: performanceRange("30d", new Date(), end!),
      fetchedAt: "2026-11-14T00:00:00Z",
      previousSearch: { start: "2026-09-13", end: "2026-10-12", clicks: 20 },
      search: { status: "ready", data: { clicks: 12, impressions: 100, queries: [], queriesAvailable: true } },
      traffic: unconfigured, reading: unconfigured, feedback: unconfigured,
    } } });
  });
  await page.getByRole("link", { name: "검색과 글 성과 보기" }).click();
  const report = page.getByRole("dialog", { name: `${post.title} 성과` });
  await expect(report.getByText(/기간별 성과: 2026-10-13 ~ 2026-11-11/)).toBeVisible();
  await expect(report.getByText("직전 기간 2026-09-13 ~ 2026-10-12 · 검색 클릭 20회 → 12회")).toBeVisible();
});

test("관리자 진입 주소는 쿠키 유무에 따라 렌더링 전에 이동한다", async ({ page }) => {
  const anonymous = await page.request.get("/admin", { maxRedirects: 0 });
  expect(anonymous.status()).toBe(307);
  expect(new URL(anonymous.headers().location, anonymous.url()).pathname).toBe("/admin/login");

  await setup(page);
  const authenticated = await page.request.get("/admin", { maxRedirects: 0 });
  expect(authenticated.status()).toBe(307);
  expect(new URL(authenticated.headers().location, authenticated.url()).pathname).toBe("/admin/operations/overview");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/admin");
  await expect(page.getByRole("navigation", { name: "관리자 워크스페이스" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("원장은 작업함에서 콘텐츠 기획 도구에 접근할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setup(page);
  await page.route(/\/api\/admin\/(content-coverage|naver-datalab|naver-searchad|keyword-taxonomy)\//, route =>
    route.fulfill({ status: 503, json: { message: "메뉴 검증용 조회 차단" } }));
  await page.goto("/admin/content/posts/new");
  const main = page.getByRole("navigation", { name: "관리자 워크스페이스", exact: true });
  await expect(main.getByRole("link")).toHaveText(["운영", "콘텐츠", "시스템"]);
  await expect(main.getByRole("link", { name: "콘텐츠", exact: true })).toHaveAttribute("aria-current", "page");
  const content = page.getByRole("navigation", { name: "콘텐츠 세부 화면", exact: true });
  await expect(content.getByRole("link")).toHaveText(["작업함", "포스트", "발행 일정", "이미지"]);
  await expect(content.getByRole("link", { name: "포스트", exact: true })).toHaveAttribute("aria-current", "page");
  const tools = page.getByRole("navigation", { name: "관리자 보조 도구", exact: true });
  await expect(tools).toHaveCount(0);
  const workNav = page.getByRole("navigation", { name: "콘텐츠 작업함 화면", exact: true });
  await expect(workNav).toHaveCount(0);
  await main.getByRole("link", { name: "콘텐츠", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/tasks");
  await expect(content.getByRole("link", { name: "작업함", exact: true })).toHaveAttribute("aria-current", "page");
  const list = workNav.getByRole("link", { name: "작업 목록", exact: true });
  const action = workNav.getByRole("link", { name: "행동추천", exact: true });
  await expect(workNav.getByRole("link")).toHaveText(["작업 목록", "행동추천", "기회 분석", "검색 트렌드·키워드"]);
  await expect(list).toHaveAttribute("aria-current", "page");
  await expect(workNav).toHaveCSS("grid-template-columns", /^\S+ \S+$/);

  await page.getByRole("button", { name: /^검토 필요/ }).click();
  await page.getByRole("searchbox", { name: "작업 검색" }).fill("임플란트");
  await page.getByRole("combobox", { name: "작업 유형" }).selectOption("blog");
  for (const [label, path] of [
    ["행동추천", "/admin/content/strategy/actions"],
    ["기회 분석", "/admin/content/strategy"],
    ["검색 트렌드·키워드", "/admin/content/trends"],
  ]) {
    const link = workNav.getByRole("link", { name: label, exact: true });
    await link.click();
    await expect(page).toHaveURL(path);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expect(workNav.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await expect(content.getByRole("link", { name: "작업함", exact: true })).toHaveAttribute("aria-current", "page");
  await list.click();
  await expect(page.getByRole("button", { name: /^검토 필요/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "작업 검색" })).toHaveValue("임플란트");
  await expect(page.getByRole("combobox", { name: "작업 유형" })).toHaveValue("blog");

  await page.goto("/admin/content/strategy/reevaluation-review");
  await expect(action).toHaveAttribute("aria-current", "page");
});

test("원장은 운영과 시스템의 세부 화면을 전환할 수 있다", async ({ page }) => {
  await setup(page);
  await page.route("**/api/admin/site-config/*", route => route.fulfill({ status: 503, json: { message: "메뉴 검증용 조회 차단" } }));
  await page.goto("/admin/operations/overview");
  const main = page.getByRole("navigation", { name: "관리자 워크스페이스", exact: true });
  await expect(page).toHaveURL("/admin/operations/overview");
  const operation = page.getByRole("navigation", { name: "운영 세부 화면", exact: true });
  await expect(operation.getByRole("link")).toHaveText(["오늘 할 일", "검색 성과", "방문·읽기", "문의·공유", "보험 양식", "색인 상태"]);
  await operation.getByRole("link", { name: "검색 성과", exact: true }).click();
  await expect(page).toHaveURL("/admin/analysis/search");
  await expect(main.getByRole("link", { name: "운영", exact: true })).toHaveAttribute("aria-current", "page");
  await main.getByRole("link", { name: "시스템", exact: true }).click();
  await expect(page).toHaveURL("/admin/system/settings");
  await expect(main.getByRole("link", { name: "시스템", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "시스템 세부 화면", exact: true }).getByRole("link")).toHaveText(["병원 설정", "계정 관리", "성능", "프로젝트", "레퍼런스"]);
});

test("직원은 원장 화면에 접근하면 직원 홈으로 돌아간다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, undefined, { isOwner: false });
  await page.goto("/admin/system/monitoring");
  await expect(page).toHaveURL("/staff");
  await expect(page.getByRole("navigation", { name: "관리자 워크스페이스" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "관리자 보조 도구" })).toHaveCount(0);
  await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "업무 화면 전환" }).getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
  await page.goto("/staff/posts");
  await expect(page).toHaveURL("/staff/posts");
  await expect(page.getByRole("button", { name: "새 글 작성", exact: true })).toHaveCount(0);
});

test("직원은 홈과 블로그 공유를 한 줄 메뉴에서 전환한다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page, undefined, { isOwner: false });
  await page.goto("/staff/login");
  await expect(page).toHaveURL("/staff");
  const nav = page.getByRole("navigation", { name: "직원 업무 메뉴" });
  const links = nav.getByRole("link");
  await expect(links).toHaveText(["홈", "환자안내", "블로그 공유", "보험 양식"]);
  const boxes = await Promise.all((await links.all()).map(link => link.boundingBox()));
  expect(new Set(boxes.map(box => box?.y)).size).toBe(1);
  const home = nav.getByRole("link", { name: "홈", exact: true });
  const blog = nav.getByRole("link", { name: "블로그 공유", exact: true });
  await expect(home).toHaveAttribute("aria-current", "page");
  await blog.click();
  await expect(page).toHaveURL("/staff/posts");
  await expect(blog).toHaveAttribute("aria-current", "page");
  await expect(home).not.toHaveAttribute("aria-current", /.+/);
  await home.click();
  await expect(page).toHaveURL("/staff");
});

test("직원은 공개 글 수정안을 보내고 블로그 공유에서 처리 상태를 확인한다", async ({ page }) => {
  await setup(page, undefined, { isOwner: false });
  const published = { ...post, published: true, date: "2026-01-01", subtitle: "치료 후 식사 방법", excerpt: "치료 후 식사 방법을 안내하는 공개 글입니다.", blocks: [{ type: "paragraph", text: "치료 후에는 마취가 풀린 다음 식사하세요." }] };
  const baseRevision = "00000000-0000-4000-8000-000000000001";
  const createdAt = "2026-11-22T16:00:00.000Z";
  await page.route("**/api/admin/blog-posts?status=published", route => route.fulfill({ json: { data: [published] } }));
  await page.route(`**/api/admin/blog-posts/${post.slug}`, route => route.fulfill({ json: { data: published } }));
  await page.route(`**/api/admin/blog-posts/${post.slug}/source`, route => route.fulfill({
    json: { data: { ...published, revision: baseRevision, source: "supabase" } },
  }));
  let submitted = false;
  await page.route("**/api/admin/content-revisions", async route => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({ slug: post.slug, baseRevision });
    submitted = true;
    await route.fulfill({ status: 201, json: { data: { id: "new-revision", status: "created" } } });
  });
  await page.route("**/api/admin/content-revisions?scope=mine", route => route.fulfill({
    json: { data: submitted ? [
      { id: "new-revision", slug: post.slug, title: published.title, status: "draft", created_at: createdAt },
      { id: "old-revision", slug: "older-post", title: "이미 반영한 글", status: "applied", created_at: createdAt },
    ] : [] },
  }));

  await page.goto("/staff/posts");
  const revisions = page.getByRole("region", { name: "내 수정안" });
  await expect(revisions.getByText("보낸 수정안이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: `${published.title} 수정` }).click();
  await page.getByRole("button", { name: "수정안 검토 요청", exact: true }).click();
  await expect(page).toHaveURL("/staff/posts#my-revisions");
  const pending = revisions.getByRole("listitem").filter({ hasText: published.title });
  await expect(pending.getByText("검토 대기")).toBeVisible();
  await expect(pending.getByText("2026-11-23", { exact: true })).toBeVisible();
  await expect(revisions.getByRole("listitem").filter({ hasText: "이미 반영한 글" }).getByText("반영 완료")).toBeVisible();
});

test("직원은 리뷰 안내에서 환자용 주소와 안내 문구를 복사한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const path = "/staff/first-visit/review";
  const unauthenticated = await page.request.get(path, { maxRedirects: 0 });
  expect(unauthenticated.status()).toBe(307);
  expect(new URL(unauthenticated.headers().location, unauthenticated.url()).pathname).toBe("/staff/login");

  await setup(page, undefined, { isOwner: false });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/staff");
  const guide = page.getByRole("navigation", { name: "직원 업무 메뉴" })
    .getByRole("link", { name: "환자안내", exact: true });
  await expect(guide).toHaveAttribute("href", path);
  await guide.press("Enter");
  await expect(page).toHaveURL(path, { timeout: 15_000 });
  await expect(guide).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "리뷰 안내", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "환자안내" })).toHaveCount(0);

  const url = "https://www.born2smile.co.kr/review";
  const linkSection = page.getByRole("region", { name: "환자용 리뷰 링크" });
  await expect(linkSection.getByRole("link")).toHaveAttribute("href", url);
  await linkSection.getByRole("button", { name: "리뷰 링크 복사" }).click();
  await expect(linkSection.getByRole("status")).toHaveText("리뷰 링크를 복사했습니다.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

  const messageSection = page.getByRole("region", { name: "문자·카카오톡 문구" });
  const preview = await messageSection.getByText(/안녕하세요, 서울본치과입니다/).textContent();
  await messageSection.getByRole("button", { name: "안내 문구 복사" }).click();
  await expect(messageSection.getByRole("status")).toHaveText("안내 문구를 복사했습니다.");
  const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n");
  expect(copied).toBe(preview);
  expect(copied).toContain("네이버와 구글 중 편한 곳");
  expect(copied).toMatch(/\n\nhttps:\/\/www\.born2smile\.co\.kr\/review$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("원장은 같은 직원 업무 메뉴를 사용하고 관리자 화면으로 돌아갈 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.hasAttribute("data-workspace-indicator")) {
        this.setAttribute("data-test-slide", JSON.stringify(keyframes));
        this.setAttribute("data-test-slide-duration", String(typeof options === "number" ? options : options?.duration));
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.goto("/admin/operations/overview");
  const switcher = page.getByRole("navigation", { name: "업무 화면 전환" });
  const indicator = switcher.locator("[data-workspace-indicator]");
  const clinicName = page.getByRole("link", { name: /서울대학교 엠블럼/ }).locator("span");
  const admin = switcher.getByRole("link", { name: "Admin", exact: true });
  const staff = switcher.getByRole("link", { name: "Staff", exact: true });
  await expect(admin).toHaveAttribute("aria-current", "location");
  await expect(admin).toHaveCSS("text-decoration-line", "none");
  await expect(admin).toHaveCSS("font-weight", "700");
  await expect(indicator).toHaveCSS("background-image", "none");
  await expect(indicator).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(switcher).toHaveCSS("box-shadow", /inset/);
  await expect(indicator).toHaveCSS("box-shadow", /inset/);
  await expect(indicator).not.toHaveAttribute("data-test-slide", /.+/);
  for (const width of [320, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator("html")).toHaveCSS("scrollbar-gutter", width === 1280 ? "stable" : "auto");
    const adminBox = (await admin.boundingBox())!;
    const staffBox = (await staff.boundingBox())!;
    expect(adminBox.y).toBe(staffBox.y);
    expect(adminBox.width).toBe(staffBox.width);
    expect(adminBox.width).toBeGreaterThanOrEqual(44);
    expect(staffBox.width).toBeGreaterThanOrEqual(44);
    expect(adminBox.height).toBeGreaterThanOrEqual(44);
    expect(staffBox.height).toBeGreaterThanOrEqual(44);
    expect(staffBox.x + staffBox.width).toBeLessThanOrEqual(width);
    expect(await clinicName.evaluate((name) => name.scrollWidth <= name.clientWidth)).toBe(true);
  }
  await staff.click();
  await expect(page).toHaveURL("/staff", { timeout: 15_000 });
  await expect(staff).toHaveAttribute("aria-current", "location");
  await expect(admin).not.toHaveAttribute("aria-current", "location");
  await expect(indicator).toHaveAttribute("data-test-slide", /translateX\(calc\(-100%/);
  await expect(indicator).toHaveAttribute("data-test-slide-duration", "280");
  const account = page.getByRole("button", { name: /^메뉴 (열기|닫기)$/ });
  const logout = page.getByRole("button", { name: "로그아웃", exact: true });
  await expect(logout).toBeHidden();
  await account.click();
  const mobileMenu = page.getByRole("navigation", { name: "모바일 메뉴", exact: true });
  await expect(mobileMenu.getByRole("link")).toHaveText(["홈", "병원 소개", "진료 안내", "건강칼럼", "상담 안내"]);
  const panel = await mobileMenu.boundingBox();
  expect(panel?.x).toBe(0);
  expect(panel?.width).toBe(390);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await expect(logout).toBeVisible();
  await expect(page).toHaveURL("/staff");
  await logout.press("Escape");
  await expect(logout).toBeHidden();
  await expect(account).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.locator("html")).toHaveCSS("scrollbar-gutter", "stable");
  const staffViewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const menu = page.getByRole("navigation", { name: "직원 업무 메뉴" });
  await expect(menu.getByRole("link")).toHaveText(["홈", "환자안내", "블로그 공유", "보험 양식"]);
  await expect(page.getByRole("navigation", { name: "관리자 워크스페이스" })).toHaveCount(0);
  await admin.press("Enter");
  await expect(page).toHaveURL("/admin/operations/overview");
  await expect(admin).toHaveAttribute("aria-current", "location");
  await expect(indicator).toHaveAttribute("data-test-slide", /translateX\(calc\(100%/);
  await expect.poll(() => page.evaluate(() => document.documentElement.clientWidth)).toBe(staffViewportWidth);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await staff.click();
  await expect(staff).toHaveAttribute("aria-current", "location");
  await expect(indicator).not.toHaveAttribute("data-test-slide", /.+/);
});

test("원장은 계정 목록과 접속 기록을 보고 설정에서 직원 접근을 중지한다", async ({ page }) => {
  await setup(page);
  const email = "desk@example.invalid";
  let enabled = true;
  await page.route("**/api/admin/accounts", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ email, enabled: false });
      enabled = body.enabled;
      return route.fulfill({ json: { data: { email } } });
    }
    return route.fulfill({ json: { data: {
      accounts: [{ email, isOwner: false, enabled }],
      presence: [{ email, browser_id: "desk-browser", device_name: "데스크", public_ip: "192.0.2.1", last_seen_at: new Date().toISOString() }],
      checkedAt: Date.now(),
    } } });
  });
  await page.goto("/admin/operations/accounts");
  await expect(page.getByText("192.0.2.1")).toBeVisible();
  await expect(page.getByRole("button", { name: "사용 상태 변경" })).toHaveCount(0);
  await page.getByRole("button", { name: "계정 설정" }).click();
  await page.getByRole("button", { name: "사용 상태 변경" }).click();
  await page.getByRole("checkbox", { name: "사용 허용" }).uncheck();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("직원 · 중지", { exact: false })).toBeVisible();
});

test("원장은 작업함 검토 필요에서 공개·예약 글 수정안을 확인한다", async ({ page }) => {
  await setup(page);
  await page.route("**/api/admin/publication-review", route => route.fulfill({
    json: {
      data: {
        drafts: [{ slug: "pending-post", title: "발행 검토를 요청한 초안" }],
        revisions: [{ id: "revision-id", slug: "published-post", reason: "본문 보완" }],
      },
    },
  }));
  const content = { ...post, blocks: [] };
  await page.route(url => url.pathname === "/api/admin/content-revisions/revision-id", route => route.fulfill({
    json: { data: { id: "revision-id", slug: post.slug, reason: "본문 보완", status: "draft", base_revision: "v1", original: content, candidate: content } },
  }));

  await page.goto("/admin/content/posts");
  await expect(page.getByRole("heading", { name: "검토 대기 수정안" })).toHaveCount(0);
  await page.goto("/admin/content/tasks");
  await page.getByRole("button", { name: /^검토 필요/ }).click();
  await expect(page.getByRole("heading", { name: "검토 대기 수정안" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "발행 요청", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "발행 검토를 요청한 초안" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "작업 검색" }).fill("보완");
  await page.getByRole("combobox", { name: "작업 유형" }).selectOption("blog");
  await page.getByRole("link", { name: "본문 보완 · published-post" }).click();
  await expect(page.getByRole("heading", { name: "콘텐츠 수정안 검토" })).toBeVisible();
  await page.getByRole("link", { name: "작업 목록으로 돌아가기" }).click();
  await expect(page).toHaveURL(/#pending-revisions$/);
  await expect(page.getByRole("button", { name: /^검토 필요/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "작업 검색" })).toHaveValue("보완");
  await expect(page.getByRole("combobox", { name: "작업 유형" })).toHaveValue("blog");
  await page.goto("/admin/content/review");
  await expect(page).toHaveURL("/admin/content/tasks?stage=review#pending-revisions");
});

test("콘텐츠 관리자는 초안을 저장해 원장에게 검토를 요청할 수 있다", async ({ page }) => {
  await setup(page, undefined, { isOwner: false });
  const draft = { ...post, subtitle: "치료 후 관리", excerpt: "치료 후 식사 방법을 안내하는 초안입니다.", date: "2026-11-22", blocks: [{ type: "paragraph", text: "치료 후에는 마취가 풀린 다음 식사하세요." }] };
  const actions: string[] = [];
  await page.route(`**/api/admin/blog-posts/${post.slug}`, async (route) => {
    if (route.request().method() === "PUT") {
      expect(route.request().postDataJSON().published).toBe(false);
      actions.push("save");
      return route.fulfill({ json: { data: { slug: post.slug } } });
    }
    return route.fulfill({ json: { data: draft } });
  });
  await page.route("**/api/admin/publication-review", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ slug: post.slug });
      actions.push("review");
      return route.fulfill({ json: { data: { slug: post.slug } } });
    }
    return route.fulfill({ json: { data: { drafts: [draft], revisions: [] } } });
  });
  await page.goto(`/staff/posts/${post.slug}`);
  await expect(page.getByRole("button", { name: "저장 후 발행", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "저장 후 검토 요청", exact: true }).click();
  await expect(page).toHaveURL("/staff/review", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "검토 대기 원고" })).toBeVisible();
  await expect(page.getByRole("link", { name: draft.title })).toBeVisible();
  expect(actions).toEqual(["save", "review"]);
});

test("콘텐츠 행동추천에서 두 검토 화면으로 이동한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.route("**/api/admin/content-coverage/actions", route => route.fulfill({ json: { data: {
    recommendations: [],
    assessmentInput: { version: "test", adminOverrideCount: 0, completedReevaluationCount: 0 },
    stats: { reviewsPending: 0, ready: 0, blocked: 0, promoted: 0, reevaluationPending: 0 },
    valueAudit: {
      volumeCoverage: 0,
      stats: { scored: 0, total: 0, average: null, median: null, minimum: null, maximum: null, now: 0, next: 0, watch: 0, rankSensitive: 0 },
      warnings: [],
      items: [],
    },
    topicExpansion: { eligibleCount: 0, recommended: [], manualReview: [] },
  } } }));
  await page.route("**/api/admin/content-coverage/*review", route => route.fulfill({
    status: 503, json: { message: "검토 화면 이동 확인" },
  }));

  for (const [label, path] of [
    ["개념별 근거 검토", "concept-review"],
    ["변경 후 재평가", "reevaluation-review"],
  ]) {
    await page.goto("/admin/content/strategy/actions");
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`/admin/content/strategy/${path}`);
    await expect(page.getByText("검토 화면 이동 확인", { exact: true })).toBeVisible();
  }

  await page.route("**/api/admin/content-coverage/reevaluation-review", route => route.fulfill({
    json: { data: { states: [], topics: [], stats: { pending: 0, needsReview: 0, completed: 0, failed: 0 } } },
  }));
  await page.reload();
  const inbox = page.getByRole("link", { name: "콘텐츠 작업함", exact: true });
  await expect(inbox).toHaveAttribute("href", "/admin/content/tasks");
  await inbox.click();
  await expect(page).toHaveURL("/admin/content/tasks");
});

for (const [path, label] of [
  ["/admin/system/devtools/project", "프로젝트"],
  ["/admin/system/devtools/ref", "레퍼런스"],
] as const) {
  test(`시스템 화면 직접 진입 시 ${label} 탭을 선택한다`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.route("**/api/dev/**", route => route.fulfill({ status: 503, json: { message: "메뉴 검증용 조회 차단" } }));
    await page.goto(path);
    const main = page.getByRole("navigation", { name: "관리자 워크스페이스", exact: true });
    await expect(main.getByRole("link", { name: "시스템", exact: true })).toHaveAttribute("aria-current", "page");
    const tabs = page.getByRole("navigation", { name: "시스템 세부 화면", exact: true });
    await expect(tabs.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(tabs.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    if (label === "프로젝트") {
      await expect(page.getByRole("heading", { name: "환경변수 상태" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "SNS 링크 상태" })).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("모바일은 메뉴를 압축하고 검색과 목록을 차트보다 먼저 제공한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/content/posts");
  const filters = page.getByRole("searchbox", { name: "제목 검색", exact: true });
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

test("IndexNow는 게시물의 최근 수정본에 제출이 필요한지 표시한다", async ({ page }) => {
  await setup(page);
  await page.route("**/api/admin/blog-posts?status=published", (route) => route.fulfill({
    json: { data: [post, { ...post, slug: "recently-accepted", title: "최근 접수된 글" }] },
  }));
  const accepted = {
    status: "accepted", source: "post_publish", url_count: 3, http_status: 200,
    started_at: "2026-11-12T01:00:00Z", ran_at: "2026-11-12T01:00:01Z",
  };
  await page.route("**/api/admin/indexnow-status*", (route) => {
    const slug = new URL(route.request().url()).searchParams.get("slug");
    return route.fulfill({ json: { data: {
      storageReady: true,
      latest: slug ? null : accepted,
      latestAccepted: accepted,
      post: slug ? { updatedAt: "2026-11-12T03:00:00Z", needsSubmission: slug === post.slug } : undefined,
    } } });
  });

  await page.goto("/admin/analysis/indexing");
  await expect(page.getByRole("heading", { name: "최근 실행" })).toBeVisible();
  const postSelect = page.getByLabel("조회할 공개 게시물");
  await postSelect.selectOption({ label: post.title });
  await expect(page.getByText("제출 필요", { exact: true })).toBeVisible();
  await expect(page.getByText("URL 3개 · HTTP 200")).toBeVisible();
  await postSelect.selectOption({ label: "최근 접수된 글" });
  await expect(page.getByText("최신 수정본 접수 완료")).toBeVisible();
  await postSelect.selectOption({ label: "사이트 전체" });
  await expect(page.getByRole("heading", { name: "최근 실행" })).toBeVisible();
});

test("모바일 색인은 카드에서 상태와 시각을 함께 보고 빈 결과에서 복구한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto("/admin/analysis/indexing");
  const cards = page.getByRole("list", { name: "색인 URL 요약" });
  await expect(cards).toBeVisible();
  await expect(cards.getByText(/^검사 시각/)).toBeVisible();
  await expect(cards.locator("time")).toHaveAttribute("datetime", indexing.items[0].inspectedAt);
  await expect(page.getByRole("heading", { name: "결과 기다리기 · 1개" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "발견됨 · 1개" })).toBeVisible();
  await expect(cards.getByText("Discovered - currently not indexed", { exact: true })).toHaveCount(0);
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
  await expect(page.getByText(/방문자 수나 전환율이 아니며/)).toBeHidden();
  await page.getByText("공유 지표 정의", { exact: true }).click();
  await expect(page.getByText(/방문자 수나 전환율이 아니며/)).toBeVisible();
  await expect(page.getByText("220%", { exact: true })).toHaveCount(0);
});

test("계측 이상은 접지 않고 표시한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.route("**/api/admin/posthog/health", route => route.fulfill({ json: { data: { summary: { healthy: false, events24h: 0, ctaEvents24h: 0, lastEventAt: null } } } }));
  await page.goto("/admin/operations/conversion");
  await expect(page.getByText("이벤트 없음", { exact: true })).toBeVisible();
  await expect(page.getByText("24시간 이벤트", { exact: true })).toBeVisible();
});

for (const width of [1280, 1440]) {
  test(`${width}px 데스크톱은 메뉴와 포스트 작업 영역을 압축하고 조회 도구를 모은다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.goto("/admin/content/posts");
    const main = await page.getByRole("navigation", { name: "관리자 워크스페이스", exact: true }).boundingBox();
    const section = await page.getByRole("navigation", { name: "콘텐츠 세부 화면", exact: true }).boundingBox();
    expect(Math.abs(main!.y - section!.y)).toBeLessThan(5);
    expect((await page.getByRole("heading", { name: "포스트 목록", exact: true }).boundingBox())!.y).toBeLessThan(600);
    await expect(page.getByRole("button", { name: "캐시 갱신", exact: true })).toBeVisible();
    await page.goto("/admin/content/tasks");
    const tools = page.getByRole("navigation", { name: "콘텐츠 작업함 화면", exact: true });
    await expect(tools).toBeVisible();
    expect((await tools.boundingBox())!.x).toBeGreaterThanOrEqual(0);
    await expect(tools).toHaveCSS("grid-template-columns", /^\S+ \S+ \S+ \S+$/);
    await tools.getByRole("link", { name: "작업 목록", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(tools.getByRole("link", { name: "행동추천", exact: true })).toBeFocused();
    await page.goto("/admin/analysis/search");
    const toolbar = page.getByRole("region", { name: "리포트 조회 도구", exact: true });
    const source = await toolbar.getByRole("link", { name: "Google Search Console" }).boundingBox();
    const period = await toolbar.getByRole("button", { name: "30일 기간 선택" }).boundingBox();
    expect(Math.abs(source!.y - period!.y)).toBeLessThan(100);
    expect((await toolbar.boundingBox())!.height).toBeLessThan(180);
    await toolbar.getByText("집계·해석 기준", { exact: true }).click();
    await expect(page.getByText(/CTR의 %p/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}


for (const workspace of ["admin", "staff"] as const) {
  test(`${workspace} 로그아웃 실패 후 재시도`, async ({ page }) => {
    await setup(page);
    await page.route("**/api/admin-presence", route => route.fulfill({ status: 204 }));
    let attempts = 0;
    await page.route(/\/auth\/v1\/logout(?:\?|$)/, route => {
      attempts++;
      return attempts === 1
        ? route.fulfill({ status: 400, json: { code: "unexpected_failure", message: "Test logout failure" } })
        : route.fulfill({ status: 204 });
    });
    await page.route(`**/${workspace}/login`, route => route.fulfill({ body: "Login" }));
    await page.goto(workspace === "admin" ? "/admin/operations/overview" : "/staff");
    await page.locator("header summary").click();
    const logout = page.getByRole("button", { name: "로그아웃", exact: true });
    await logout.click();
    await expect(page.getByRole("alert").getByText("로그아웃하지 못했습니다. 다시 시도해 주세요.")).toBeVisible();
    await expect(page).not.toHaveURL(`/${workspace}/login`);
    await logout.click();
    await expect(page).toHaveURL(`/${workspace}/login`);
    expect(attempts).toBe(2);
  });
}
