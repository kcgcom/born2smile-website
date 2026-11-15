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
  await page.route("**/api/admin/**", route => route.fulfill({ json: { ok: true } }));
}

const resource = "https://www.born2smile.co.kr/_next/static/chunks/very-long-resource-file-name-for-mobile-layout.css";
const title = "Eliminate render-blocking resources that delay the first paint";
function response(strategy = "mobile", score = 62) {
  return { data: { result: {
    strategy, fetchedAt: "2026-11-15T01:30:00Z", url: "https://www.born2smile.co.kr", overallCategory: "AVERAGE",
    categories: ["performance", "accessibility", "seo", "best-practices"].map(id => ({ id, title: id, score })),
    coreWebVitals: ["LCP", "INP", "CLS", "FCP", "TTFB"].map((label, i) => ({ id: label, label, percentile: [2800, 240, 12, 1900, 850][i], category: "AVERAGE", unit: "ms" })),
    audits: [{ id: "render-blocking", title, score: 35, savingsMs: 1250, savingsBytes: 125000, displayValue: "Est savings of 1,250 ms", description: "Resources delay the first paint.", items: [{ url: resource, totalBytes: 125000 }] }],
  } } };
}

for (const width of [360, 390]) {
  test(width + "px 성능 화면은 조작부와 진단 제목·전체 리소스 주소를 잘리지 않게 표시한다", async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.route("**/api/dev/pagespeed?**", route => route.fulfill({ json: response(new URL(route.request().url()).searchParams.get("strategy")!) }));
    await page.goto("/admin/system/monitoring");
    const heading = page.getByRole("heading", { name: "Lighthouse 점수", exact: true });
    await expect(heading).toBeVisible();
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
  await page.route("**/api/dev/pagespeed?**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("force") && fail) return route.fulfill({ status: 503, json: { message: "재측정 연결 실패" } });
    return route.fulfill({ json: response(url.searchParams.get("strategy")!, url.searchParams.has("force") ? 88 : 62) });
  });
  await page.goto("/admin/system/monitoring");
  await expect(page.getByRole("heading", { name: "Lighthouse 점수" })).toBeVisible();
  await page.getByRole("button", { name: "새로 분석", exact: true }).click();
  await expect(page.getByText("재측정 연결 실패", { exact: true })).toBeVisible();
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
