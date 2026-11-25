import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function setup(page: Page) {
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
  await page.route("**/api/admin/**", route => route.fulfill({ json: { ok: true, access: { isOwner: true, permissions: ["operations", "content", "staff"] } } }));
  await page.route("**/api/dev/crux", route => route.fulfill({ json: { latest: null, history: [], latestError: null, historyError: null } }));
}

test("CrUX 통합 집계는 Lighthouse 오류와 별개로 누락 지표와 주간 수치를 표시한다", async ({ page }) => {
  await setup(page);
  const latest = { start: "2026-10-26", end: "2026-11-22", lcp: 1183, inp: null, cls: 0 };
  await page.route("**/api/dev/crux", route => route.fulfill({ json: {
    latest,
    history: [{ start: "2026-10-19", end: "2026-11-15", lcp: null, cls: null, inp: null }, latest],
    latestError: null,
    historyError: null,
  } }));
  await page.route("**/api/dev/pagespeed?**", route => route.fulfill({ status: 502, json: { message: "Lighthouse 조회 실패" } }));
  await page.goto("/admin/system/monitoring");
  const source = page.getByRole("link", { name: "PageSpeed Insights" });
  await expect(source).toHaveAttribute("href", "https://pagespeed.web.dev/");
  expect(await source.evaluate(link => {
    const selector = document.getElementById("pagespeed-target");
    return selector !== null && Boolean(link.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(page.getByRole("heading", { name: "실사용 성능 추세" })).toBeVisible();
  await expect(page.getByText("전체 사이트 · 모든 기기 · Chrome 실사용 데이터(CrUX)")).toBeVisible();
  await expect(page.getByText("1,183 ms", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("0.00", { exact: true }).first()).toBeVisible();
  const lcpChart = page.getByRole("heading", { name: "LCP 추세 (ms)" }).locator("..");
  const clsChart = page.getByRole("heading", { name: "CLS 추세" }).locator("..");
  await expect(lcpChart.getByText(/2\.5초 이하면 양호/)).toBeVisible();
  await expect(clsChart.getByText(/0\.10 이하면 양호/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "INP 추세" })).toHaveCount(0);
  await page.getByText("기간별 수치 보기").click();
  const missingWeek = page.getByRole("row").filter({ hasText: "2026-10-19" });
  await expect(missingWeek.getByText("데이터 없음")).toHaveCount(3);
  await expect(page.getByText("Lighthouse 조회 실패")).toBeVisible();
});

const resource = "https://www.born2smile.co.kr/_next/static/chunks/very-long-resource-file-name-for-mobile-layout.css";
const title = "Eliminate render-blocking resources that delay the first paint";
function response(strategy = "mobile", score = 62) {
  return { data: { result: {
    strategy, fetchedAt: "2026-11-15T01:30:00Z", url: "https://www.born2smile.co.kr",
    categories: ["performance", "accessibility", "seo", "best-practices"].map(id => ({ id, title: id, score })),
    audits: [{ id: "render-blocking", title, score: 35, savingsMs: 1250, savingsBytes: 125000, displayValue: "Est savings of 1,250 ms", description: "Resources delay the first paint.", items: [{ url: resource, totalBytes: 125000 }] }],
  } } };
}

test("추가 Lighthouse 페이지는 선택한 기기로 수동 검사하고 다른 페이지 결과와 섞이지 않는다", async ({ page }) => {
  await setup(page);
  const manual: string[] = [];
  const measured = new Map<string, ReturnType<typeof response>>();
  await page.route("**/api/dev/pagespeed?**", async route => {
    const params = new URL(route.request().url()).searchParams;
    const strategy = params.get("strategy")!;
    const target = params.get("target");
    if (!target) return route.fulfill({ json: response(strategy) });
    const key = `${target}:${strategy}`;
    if (params.get("force") === "true") {
      manual.push(key);
      const payload = response(strategy, 84);
      payload.data.result.url += "/treatments/implant";
      measured.set(key, payload);
    }
    return route.fulfill({ json: measured.get(key) ?? { data: { result: null } } });
  });
  await page.goto("/admin/system/monitoring");
  await expect(page.getByRole("heading", { name: "Lighthouse 점수" })).toBeVisible();
  const selector = page.getByLabel("Lighthouse 검사 페이지");
  await selector.selectOption("implant");
  await expect(page.getByText("측정 결과가 없습니다. 새로 분석을 눌러 주세요.")).toBeVisible();
  expect(manual).toEqual([]);
  await page.getByRole("button", { name: "데스크톱" }).click();
  await page.getByRole("button", { name: "새로 분석" }).click();
  await expect(page.getByText("테스트 URL: https://www.born2smile.co.kr/treatments/implant")).toBeVisible();
  expect(manual).toEqual(["implant:desktop"]);
  await selector.selectOption("contact");
  await expect(page.getByRole("button", { name: "데스크톱" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("측정 결과가 없습니다. 새로 분석을 눌러 주세요.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lighthouse 점수" })).toHaveCount(0);
  await selector.selectOption("implant");
  await expect(page.getByText("테스트 URL: https://www.born2smile.co.kr/treatments/implant")).toBeVisible();
  await expect(page.getByRole("heading", { name: "실사용 성능 추세" })).toBeVisible();
});

for (const width of [360, 390]) {
  test(width + "px 성능 화면은 조작부와 진단 제목·전체 리소스 주소를 잘리지 않게 표시한다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.route("**/api/dev/pagespeed?**", route => route.fulfill({ json: response(new URL(route.request().url()).searchParams.get("strategy")!) }));
    await page.goto("/admin/system/monitoring");
    const heading = page.getByRole("heading", { name: "Lighthouse 점수", exact: true });
    await expect(heading).toBeVisible();
    await expect(page.getByRole("heading", { name: "PageSpeed Insights 실제 방문자 경험" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /개선 항목.*보기/ })).toHaveCount(0);
    for (const name of ["모바일", "데스크톱", "새로 분석"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeLessThanOrEqual(48);
    }
    const gauges = heading.locator("..").locator("svg");
    const boxes = await gauges.evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })));
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[2].y).toBe(boxes[3].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    const audit = page.getByRole("button", { name: new RegExp(title) });
    const opportunities = page.locator("summary").filter({ hasText: "개선 항목 (1개)" });
    await expect(opportunities).toBeVisible();
    await expect(audit).toBeHidden();
    await opportunities.press("Enter");
    await expect(audit).toBeVisible();
    const text = page.getByText(title, { exact: true });
    expect(await text.evaluate(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight)).toBe(true);
    await audit.click();
    await expect(page.getByText(resource, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("performance-mobile.png"), fullPage: true });
  });
}

test("재측정 실패는 이전 결과와 오류를 표시하고 성공하면 캐시까지 복구한다", async ({ page }) => {
  await setup(page);
  let fail = true;
  const firstMeasurement = Promise.withResolvers<void>();
  await page.route("**/api/dev/pagespeed?**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("force") && fail) {
      await firstMeasurement.promise;
      return route.fulfill({ status: 503, json: { message: "재측정 연결 실패" } });
    }
    return route.fulfill({ json: response(url.searchParams.get("strategy")!, url.searchParams.has("force") ? 88 : 62) });
  });
  await page.goto("/admin/system/monitoring");
  await expect(page.getByRole("heading", { name: "Lighthouse 점수" })).toBeVisible();
  await page.getByRole("button", { name: "새로 분석", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "분석 중…", exact: true })).toBeDisabled();
  } finally {
    firstMeasurement.resolve();
  }
  await expect(page.getByText("재측정 연결 실패", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "새로 분석", exact: true })).toBeEnabled();
  await expect(page.getByText("분석에 실패해 이전 측정 결과를 표시합니다.")).toBeVisible();
  await page.getByRole("button", { name: "데스크톱", exact: true }).click();
  await expect(page.getByText("재측정 연결 실패", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "모바일", exact: true }).click();
  fail = false;
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByText("재측정 연결 실패", { exact: true })).toHaveCount(0);
  await expect(page.getByText("점수: 88", { exact: true })).toHaveCount(4);
  const cached = await page.evaluate(() => JSON.parse(sessionStorage.getItem("swr:v2:/api/dev/pagespeed?strategy=mobile")!).data.result.categories[0].score);
  expect(cached).toBe(88);
});

test("최초 로딩·오류 중에도 환경을 전환하고 재시도하여 복구한다", async ({ page }) => {
  await setup(page);
  let fail = true;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/dev/pagespeed?**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("strategy") === "mobile" && !url.searchParams.has("force")) await pending;
    if (fail) return route.fulfill({ status: 503, json: { message: "최초 조회 실패" } });
    return route.fulfill({ json: response(url.searchParams.get("strategy")!) });
  });
  await page.goto("/admin/system/monitoring");
  await expect(page.getByRole("button", { name: "데스크톱", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "데스크톱", exact: true }).click();
  await expect(page.getByText("최초 조회 실패", { exact: true })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lighthouse 점수" })).toBeVisible();
  await expect(page.getByText("최초 조회 실패", { exact: true })).toHaveCount(0);
  release();
});
