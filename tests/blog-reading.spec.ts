import { expect, test, type Page } from "@playwright/test";
import { interceptAnalytics } from "./helpers/blog-analytics";
import { setupOutcomes } from "./helpers/admin-outcomes";
import { activeReadingDelta, getReadingMetadata, measureReadingRects } from "../lib/blog/reading";
import { readingPeriodRange, readingRate } from "../lib/blog/reading-report";
import { buildReadingQueries, fetchBlogReading, fetchPostReadingFirstObservedAt, fetchPostReadingSummary, type CacheReadingQuery } from "../lib/admin-blog-reading";
import { getAnalyticsPage, getContactChannel } from "../lib/analytics-events";
import { blogCardAttributes, visibleCardRatio } from "../lib/blog/card-tracking";
import { PERFORMANCE_AUDIT_PARAM } from "../lib/performance-audit";

const PATH = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";
// The SDK intentionally ignores HeadlessChrome. Exercise normal visitor capture.
test.use({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" });

async function getPostHogOptOutKey(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(name => /^ph_.+_posthog$/.test(name));
    if (!key) throw new Error("PostHog 저장 키를 찾을 수 없습니다.");
    return key.replace(/^ph_(.+)_posthog$/, "__ph_opt_in_out_$1");
  });
}

for (const mode of ["missing", "throwing"] as const) {
  test(`UUID를 사용할 수 없어도 공개 본문과 전화·예약이 동작한다 (${mode})`, async ({ page }) => {
    const { events, undecoded } = await interceptAnalytics(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(mode => {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: mode === "missing" ? undefined : () => { throw new Error("UUID unavailable"); },
      });

      window.ResizeObserver = class extends ResizeObserver {
        private readingRoot?: HTMLElement;

        override observe(target: Element, options?: ResizeObserverOptions) {
          if (target instanceof HTMLElement && target.matches("[data-blog-reading-root]")) {
            this.readingRoot = target;
            target.dataset.testReadingObserver = "active";
          }
          super.observe(target, options);
        }

        override disconnect() {
          if (this.readingRoot) this.readingRoot.dataset.testReadingObserver = "disconnected";
          super.disconnect();
        }
      };
    }, mode);
    await page.route("https://m.booking.naver.com/**", route => route.fulfill({ body: "네이버 예약 테스트" }));
    await page.route("https://dapi.kakao.com/v2/maps/**", route => route.abort());
    await page.clock.install();
    expect((await page.goto(PATH))?.status()).toBe(200);
    await expect.poll(() => events.find(e => e.event === "$pageview")?.properties.crypto_random_uuid_supported)
      .toBe(mode === "throwing");

    const root = page.locator("#main-content [data-blog-reading-root]");
    await expect(root).toBeVisible();
    await expect(root.locator("[data-reading-block]")).toHaveCount(17);
    await page.evaluate(() => {
      window.scrollBy({ top: 400, behavior: "instant" });
      window.dispatchEvent(new Event("scroll"));
    });

    if (mode === "missing") {
      expect(await root.getAttribute("data-test-reading-observer")).toBeNull();
    } else {
      await expect(root).toHaveAttribute("data-test-reading-observer", "disconnected");
    }
    expect(events.filter(e => e.event === "blog_article_viewed" || e.event.startsWith("blog_read_"))).toEqual([]);

    const menu = page.getByRole("navigation", { name: "빠른 메뉴" });
    await menu.getByRole("link", { name: "문의 및 예약" }).click();
    await expect(page).toHaveURL("/contact");
    const main = page.getByRole("main");
    const phone = main.getByRole("link", { name: /^대표전화/ });
    await expect(phone).toHaveAttribute("href", "tel:18337552");
    await phone.evaluate(link => link.addEventListener("click", event => event.preventDefault(), { once: true }));
    await phone.click();
    await page.clock.runFor(5000);
    await expect.poll(() => events.some(e => e.event === "floating_contact_nav_click")).toBe(true);
    await expect.poll(() => events.some(e => e.event === "contact_phone_click")).toBe(true);

    await main.getByRole("link", { name: "네이버 예약" }).click();
    await expect(page).toHaveURL(/^https:\/\/m\.booking\.naver\.com\/booking\/16\/bizes\/1768707\?/);
    expect(undecoded).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("카드 측정은 내부 글 링크와 실제 보이는 면적을 사용한다", () => {
  expect(blogCardAttributes("https://example.com", "related_manual", 1)).toEqual({});
  expect(blogCardAttributes("/about", "related_manual", 1)).toEqual({});
  expect(blogCardAttributes(PATH, "listing", 2)["data-card-position"]).toBe(2);
  expect(visibleCardRatio({ left: 0, right: 100, top: 50, bottom: 150, width: 100, height: 100 }, 100, 100)).toBe(0.5);
  expect(visibleCardRatio({ left: 0, right: 100, top: 200, bottom: 300, width: 100, height: 100 }, 100, 100)).toBe(0);
});


test("읽기 길이·본문 경계·활성 시간은 링크/숨김/방치 구간을 제외한다", () => {
  const metadata = getReadingMetadata([
    { type: "paragraph", text: "가".repeat(500) },
    { type: "relatedLinks", items: [{ title: "제외", href: "https://example.com" }] },
    { type: "image", src: "/unused.jpg", alt: "제외", caption: "숨김 설명", hidden: true },
  ]);
  expect(metadata.readable_char_count).toBe(500);
  expect(metadata.estimated_read_seconds).toBe(60);
  expect(metadata.required_active_seconds).toBe(15);
  expect(getReadingMetadata([]).required_active_seconds).toBeNull();
  expect(getReadingMetadata([{ type: "paragraph", text: "가".repeat(10000) }]).required_active_seconds).toBe(90);
  expect(measureReadingRects([{ top: -50, bottom: 50, height: 100 }, { top: 1000, bottom: 1100, height: 100 }], 500)).toEqual({ depth: 50, visible: true });
  expect(activeReadingDelta(59_500, 60_500, 0, true)).toBe(500);
  expect(activeReadingDelta(0, 1000, 0, false)).toBe(0);
  expect(activeReadingDelta(0, 6000, 0, true)).toBe(0);
});

test("기간·조회·문의 분류 계약을 지킨다", () => {
  const range = readingPeriodRange("30d", new Date("2026-11-14T07:00:00Z"));
  expect(range.periodStart).toBe("2026-10-14T15:00:00.000Z");
  expect(range.periodEndExclusive).toBe("2026-11-13T15:00:00.000Z");
  expect(readingRate(0, 0)).toBe("—");
  expect(readingRate(2, 3)).toBe("66.7%");
  expect(getContactChannel("footer_phone_click")).toBe("phone");
  expect(getContactChannel("footer_kakao_channel_click")).toBe("kakao");
  expect(getContactChannel("hero_contact_click")).toBe("navigation");
  expect(getAnalyticsPage(PATH).page_type).toBe("blog_post");
  expect(getAnalyticsPage("/blog/redirect/test").page_type).not.toBe("blog_post");
  expect(() => buildReadingQueries("30d", "' OR 1=1")).toThrow();
  const query = buildReadingQueries("30d", "after-care");
  expect(query.rows).not.toContain("OFFSET");
  expect(query.rows).toContain("WHERE slug > 'after-care'");
  expect(query.summary).not.toContain("LIMIT");
});

test("집계 조회는 부분 실패를 0으로 숨기지 않고 커서를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["POSTHOG_PROJECT_ID", "POSTHOG_API_KEY", "POSTHOG_BASE_URL"] as const;
  const originalEnv = keys.map(key => process.env[key]);
  let failSummary = false;
  let failQuality = true;
  const queries: { name: string; query: { query: string } }[] = [];
  Object.assign(process.env, { POSTHOG_PROJECT_ID: "test", POSTHOG_API_KEY: "test-only", POSTHOG_BASE_URL: "https://analytics.example.invalid" });
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    queries.push(body);
    if (body.name.startsWith("blog_read_summary")) return failSummary
      ? Response.json({}, { status: 503 })
      : Response.json({ results: [{ visits: 3, eligibleVisits: 3, qualified: 2, total_posts: 26 }] });
    if (body.name.startsWith("blog_read_rows")) return Response.json({ results: Array.from({ length: 26 }, (_, i) => ({ slug: `post-${String(i).padStart(2, "0")}`, path: `/blog/implant/post-${i}`, visits: 1 })) });
    if (body.name.startsWith("blog_read_quality")) return failQuality
      ? Response.json({}, { status: 503 })
      : Response.json({ results: [{ invalid_events: 0, orphan_views: 0, duplicate_starts: 0 }] });
    return Response.json({ results: [{ first_at: "2026-11-01T00:00:00Z", starts: 3 }] });
  };
  try {
    const report = await fetchBlogReading("30d", null);
    expect(report.summary.qualified).toBe(2);
    expect(report.rows).toHaveLength(25);
    expect(report.nextCursor).toBe("post-24");
    expect(report.quality).toBeNull();
    expect(report.meta.partial).toBe(true);
    expect(report.warnings).toContain("수집 품질 데이터를 불러오지 못했습니다.");
    queries.length = 0;
    const [summary, first] = await Promise.all([
      fetchPostReadingSummary("after-care", "30d", new Date("2026-11-14T00:00:00Z")),
      fetchPostReadingFirstObservedAt("after-care"),
    ]);
    expect(summary.qualified).toBe(report.summary.qualified);
    expect(first).toBe(report.meta.firstObservedAt);
    expect(queries.map(query => query.name)).toEqual(["blog_read_summary_30d", "blog_read_first"]);
    expect(queries.every(({ query }) => query.query.includes("properties.blog_slug = 'after-care'"))).toBe(true);
    expect(queries[1].query.query).not.toContain("timestamp >=");
    failQuality = false;
    const cache = new Map<string, unknown>();
    const cacheForPage = (cursor: string | null): CacheReadingQuery => async (section, run) => {
      const key = section === "rows" ? `rows-${cursor}` : section;
      if (cache.has(key)) return cache.get(key) as Awaited<ReturnType<typeof run>>;
      const value = await run();
      cache.set(key, value);
      return value;
    };
    const firstPage = await fetchBlogReading("30d", null, { cacheQuery: cacheForPage(null) });
    queries.length = 0;
    const nextPage = await fetchBlogReading("30d", firstPage.nextCursor, { cacheQuery: cacheForPage(firstPage.nextCursor) });
    expect(queries.map(query => query.name)).toEqual(["blog_read_rows_30d"]);
    expect(queries[0].query.query).toContain("WHERE slug > 'post-24'");
    expect(nextPage.summary).toEqual(firstPage.summary);
    expect(nextPage.quality).toEqual(firstPage.quality);
    expect(nextPage.meta.fetchedAt).toBe(firstPage.meta.fetchedAt);
    failSummary = true;
    await expect(fetchBlogReading("30d", null)).rejects.toThrow();
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => { if (originalEnv[i] === undefined) delete process.env[key]; else process.env[key] = originalEnv[i]; });
  }
});

test("상세 방문은 한 번 수집하고 공유는 같은 view에 연결한다", async ({ page }) => {
  const { events, undecoded } = await interceptAnalytics(page);
  await page.goto(PATH);
  await expect(page.locator("#main-content [data-blog-reading-root]")).toBeVisible();
  await expect.poll(() => events.filter(e => e.event === "blog_article_viewed").length, { timeout: 15000 }).toBe(1);
  await page.getByRole("button", { name: "이 글 공유하기", exact: true }).first().click();
  await expect.poll(() => events.filter(e => e.event === "blog_post_shared").length).toBe(1);
  const start = events.find(e => e.event === "blog_article_viewed")!;
  const share = events.find(e => e.event === "blog_post_shared")!;
  await expect.poll(() => events.find(e => e.event === "$pageview")?.properties.crypto_random_uuid_supported)
    .toBe(true);
  expect(start.properties.crypto_random_uuid_supported).toBeUndefined();
  expect(share.properties.crypto_random_uuid_supported).toBeUndefined();
  expect(share.properties.article_view_id).toBe(start.properties.article_view_id);
  expect(share.properties.article_session_id).toBe(start.properties.article_session_id);
  expect(share.properties.surface).toBe("article");
  expect(share.properties.method).toBe("copied");
  await page.evaluate(() => { location.hash = "section-1"; });
  await page.waitForTimeout(3500);
  expect(events.filter(e => e.event === "blog_article_viewed")).toHaveLength(1);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await page.waitForTimeout(1500);
  expect(events.filter(e => e.event === "blog_article_viewed")).toHaveLength(1);
  expect(undecoded).toEqual([]);
  const gaEvents = await page.evaluate(() => {
    const w = window as unknown as { dataLayer?: Array<{ [key: number]: unknown }> };
    return (w.dataLayer ?? []).map(item => item[1]);
  });
  expect(gaEvents).not.toContain("blog_article_viewed");
  expect(gaEvents).not.toContain("blog_read_progress");
});

test("관리자 성능 검사 방문은 GA4와 PostHog에서 제외되고 일반 방문은 수집된다", async ({ page }) => {
  const { events, undecoded } = await interceptAnalytics(page);
  const marker = `${PERFORMANCE_AUDIT_PARAM}=1`;
  const gaConfigured = () => page.evaluate(() => {
    const dataLayer = (window as unknown as { dataLayer?: Array<{ [key: number]: unknown }> }).dataLayer;
    return dataLayer?.some(item => item[0] === "config") ?? false;
  });

  await page.goto(`${PATH}?${marker}`);
  expect(new URL(page.url()).searchParams.get(PERFORMANCE_AUDIT_PARAM)).toBe("1");
  await expect(page.locator("script#ga-init")).toBeAttached();
  await page.getByRole("button", { name: "이 글 공유하기", exact: true }).first().click();
  expect(await gaConfigured()).toBe(false);

  await page.goto(PATH);
  await expect.poll(gaConfigured).toBe(true);
  await expect.poll(() => events.some(event => event.event === "blog_article_viewed"), { timeout: 15000 }).toBe(true);
  expect(events.filter(event => String(event.properties.$current_url ?? "").includes(marker))).toEqual([]);
  expect(events.filter(event => event.event === "blog_post_shared")).toEqual([]);
  expect(undecoded).toEqual([]);
});


test("읽기 관리자 API는 인증 전 데이터 조회를 허용하지 않는다", async ({ request }) => {
  const response = await request.get("/api/admin/posthog/reading?period=30d");
  expect(response.status()).toBe(401);
});

test("본문 밖·숨김 시간은 읽기 조건을 채우지 않고 단계는 중복되지 않는다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await page.setViewportSize({ width: 390, height: 320 });
  await page.clock.install();
  await page.goto(PATH);
  await expect.poll(() => events.filter(e => e.event === "blog_article_viewed").length, { timeout: 15000 }).toBe(1);
  await page.clock.runFor(16_000);
  expect(events.filter(e => e.event === "blog_read_progress" && e.properties.milestone_type === "active_time")).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[data-reading-block]").last().scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(35_000);
  expect(events.filter(e => e.event === "blog_read_qualified")).toHaveLength(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(95_000);
  // Idle cutoff stops a stationary long read at 60 seconds. Activity resumes it.
  await page.mouse.click(5, 500);
  await page.clock.runFor(40_000);
  await expect.poll(() => events.filter(e => e.event === "blog_read_qualified").length).toBe(1);
  const reading = events.filter(e => e.event.startsWith("blog_read_") || e.event === "blog_article_viewed");
  expect(reading.length).toBeLessThanOrEqual(10);
  const start = reading.find(e => e.event === "blog_article_viewed")!;
  for (const event of reading) {
    expect(event.properties).toMatchObject({
      article_view_id: start.properties.article_view_id,
      article_session_id: start.properties.article_session_id,
    });
  }
  const steps = reading.filter(e => e.event === "blog_read_progress").map(e => `${e.properties.milestone_type}:${e.properties.milestone_value}`);
  expect(new Set(steps).size).toBe(steps.length);
});

test("수집 거부 중에는 읽기·공유를 전송하지 않고 재허용 후 새 조회를 시작한다", async ({ page }) => {
  const { events, undecoded } = await interceptAnalytics(page);
  await page.clock.install();
  await page.goto(PATH);
  const views = () => events.filter(e => e.event === "blog_article_viewed");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBe(1);
  const initialId = views()[0].properties.article_view_id;
  const consentKey = await getPostHogOptOutKey(page);

  const tracked = () => events.filter(e =>
    e.event === "blog_article_viewed" || e.event.startsWith("blog_read_") || e.event === "blog_post_shared",
  );
  const before = tracked().length;
  await page.evaluate(key => localStorage.setItem(key, "0"), consentKey);
  await page.clock.runFor(1500);
  const share = page.getByRole("button", { name: "이 글 공유하기", exact: true }).first();
  await share.click();
  await expect(share).toContainText("링크 복사됨");
  await page.clock.runFor(5000);
  expect(tracked()).toHaveLength(before);

  await page.evaluate(key => localStorage.removeItem(key), consentKey);
  await page.clock.runFor(5000);
  await expect.poll(() => views().length).toBe(2);
  expect(views()[1].properties.article_view_id).not.toBe(initialId);
  expect(undecoded).toEqual([]);
});

test("수집 거부가 저장된 상태에서 글을 다시 열면 페이지뷰를 전송하지 않는다", async ({ page }) => {
  const { events, undecoded } = await interceptAnalytics(page);
  await page.clock.install();
  await page.goto(PATH);
  const views = () => events.filter(e => e.event === "$pageview");
  await expect.poll(() => views().length, { timeout: 15_000 }).toBe(1);
  const consentKey = await getPostHogOptOutKey(page);
  await page.evaluate(key => localStorage.setItem(key, "0"), consentKey);

  await page.reload();
  const share = page.getByRole("button", { name: "이 글 공유하기", exact: true }).first();
  await share.click();
  await expect(share).toContainText("링크 복사됨");
  await page.clock.runFor(5000);

  expect(views()).toHaveLength(1);
  expect(undecoded).toEqual([]);
});

test("관리자 표시가 있으면 새 읽기 이벤트를 수집하지 않는다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await setupOutcomes(page);
  await page.goto(PATH);
  await page.locator("#main-content [data-blog-reading-root]").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "해결됐어요", exact: true })).toBeDisabled();
  await page.waitForTimeout(4000);
  expect(events.filter(e => e.event.startsWith("blog_read") || e.event === "blog_article_viewed")).toHaveLength(0);
  expect(events.filter(e => e.event.startsWith("blog_card_"))).toHaveLength(0);
});


test("실제 카드 노출과 글 클릭을 연결하고 반응 버튼 클릭은 제외한다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await page.goto("/blog?q=" + encodeURIComponent("임플란트"));
  await expect.poll(() => events.filter(e => e.event === "$pageview").length).toBeGreaterThan(0);
  const card = page.locator('[data-blog-card][data-card-surface="listing"]').first();
  await expect(async () => {
    await card.scrollIntoViewIfNeeded({ timeout: 1000 });
  }).toPass({ timeout: 5000 });
  const slug = await card.getAttribute("data-blog-card");
  const impressions = () => events.filter(e => e.event === "blog_card_impression" && e.properties.target_slug === slug);
  await expect.poll(() => impressions().length).toBe(1);
  expect(impressions()[0].properties.$current_url).toBe(new URL("/blog", page.url()).href);
  expect(impressions()[0].properties.has_search).toBe(true);
  expect(Object.keys(impressions()[0].properties).filter(key =>
    JSON.stringify(impressions()[0].properties[key]).includes(encodeURIComponent("임플란트")))).toEqual([]);
  expect(impressions()[0].properties.position).toBe(1);
  await expect(card.getByRole("button", { name: "좋아요", exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: /공유하기/ }).click();
  await page.waitForTimeout(3500);
  expect(events.filter(e => e.event === "blog_card_clicked")).toHaveLength(0);
  await card.locator("h2 a").click();
  await expect.poll(() => events.filter(e => e.event === "blog_card_clicked").length).toBe(1);
  const clicked = events.find(e => e.event === "blog_card_clicked")!;
  expect(clicked.properties.card_view_id).toBe(impressions()[0].properties.card_view_id);
  expect(clicked.properties.qualified_impression).toBe(true);
  expect(impressions()).toHaveLength(1);
});

test("노출 기준 전 클릭은 조건 미충족으로 기록하고 노출을 앞에 만들지 않는다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await page.clock.install();
  await page.goto("/blog");
  await expect.poll(() => events.some(e => e.event === "blog_card_impression")).toBe(true);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const card = page.locator('[data-blog-card][data-card-surface="listing"]').last();
  await expect(card).not.toBeInViewport();
  const slug = await card.locator("h2 a").evaluate((link: HTMLAnchorElement) => {
    const body = link.closest<HTMLElement>("[data-blog-card]");
    if (!body?.dataset.blogCard) throw new Error("블로그 카드 식별자가 필요합니다.");
    body.scrollIntoView({ block: "center", behavior: "instant" });
    link.addEventListener("click", event => event.preventDefault(), { once: true });
    link.click();
    return body.dataset.blogCard;
  });
  await page.clock.runFor(4000);
  await expect.poll(() => events.filter(e => e.event === "blog_card_clicked" && e.properties.target_slug === slug).length).toBe(1);
  const clicked = events.find(e => e.event === "blog_card_clicked" && e.properties.target_slug === slug)!;
  expect(clicked.properties.qualified_impression).toBe(false);
  const clickIndex = events.indexOf(clicked);
  expect(events.slice(0, clickIndex).filter(e => e.event === "blog_card_impression" && e.properties.card_view_id === clicked.properties.card_view_id && e.properties.target_slug === slug).length).toBe(0);
});

test("숨긴 탭의 카드는 노출에서 제외하고 다시 본 카드는 중복 집계하지 않는다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await page.goto("/blog");
  await expect.poll(() => events.filter(e => e.event === "$pageview").length).toBeGreaterThan(0);
  const card = page.locator('[data-blog-card][data-card-surface="listing"]').first();
  const slug = await card.getAttribute("data-blog-card");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const impressions = () => events.filter(e => e.event === "blog_card_impression" && e.properties.target_slug === slug).length;
  expect(impressions()).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(impressions).toBe(1);
  await page.evaluate(() => scrollTo(0, 0));
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  expect(impressions()).toBe(1);
});
