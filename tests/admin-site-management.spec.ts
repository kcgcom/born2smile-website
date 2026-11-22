import { expect, test } from "@playwright/test";
import { setupOutcomes } from "./helpers/admin-outcomes";

test("레퍼런스의 경로 검색과 유형 필터를 함께 사용할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await setupOutcomes(page);
  await page.goto("/admin/system/devtools/ref");
  const links = page.locator('main a[target="_blank"]');
  await expect(links).toHaveCount(7);
  for (const link of await links.all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: /^라우트 & 렌더링/ }).press("Enter");
  const search = page.getByRole("searchbox", { name: "경로 검색" });
  const type = page.getByRole("combobox", { name: "경로 유형" });
  await search.fill("PageSpeed");
  await type.selectOption("api");
  await expect(page.getByRole("cell", { name: "/api/dev/pagespeed/route.ts", exact: true })).toBeVisible();
  await type.selectOption("page");
  await expect(page.getByText("조건에 맞는 경로가 없습니다.")).toBeVisible();
  await search.clear();
  await expect(page.getByRole("cell", { name: "/about/page.tsx", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "/api/dev/pagespeed/route.ts", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test("프로젝트 현황은 복사 실패와 재시도 성공을 해당 항목에 표시한다", async ({ page }) => {
  await setupOutcomes(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } });
  });
  await page.route("**/api/dev/env-status", route => route.fulfill({ json: { data: {
    summary: { total: 1, configured: 1, missing: 0 },
    variables: [{ key: "TEST_PUBLIC_VALUE", label: "테스트 주소", configured: true, scope: "public", required: false, group: "supabase" }],
  } } }));
  let fail = true;
  await page.route("**/api/dev/env-value?*", route => fail
    ? route.fulfill({ status: 503, json: { message: "테스트 복사 실패" } })
    : route.fulfill({ json: { data: { value: "test-value" } } }));
  await page.goto("/admin/system/devtools/project");
  await page.getByRole("button", { name: /^환경변수 상세 목록/ }).click();
  const copy = page.getByRole("button", { name: "테스트 주소 값 복사" });
  await copy.click();
  await expect(page.getByRole("status")).toHaveText("복사 실패");
  fail = false;
  await copy.click();
  await expect(page.getByRole("status")).toHaveText("복사 완료");
});
