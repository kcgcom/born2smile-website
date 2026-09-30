import { expect, test } from "@playwright/test";

const PATH = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";

test("서버가 보낸 목차는 JS 실행 전부터 데스크톱에서 펼쳐진다", async ({ page, request }) => {
  const html = await (await request.get(PATH)).text();
  const nav = html.match(/<nav\b[^>]*aria-label="목차"[^>]*>[\s\S]*?<\/nav>/)?.[0];
  expect(nav).toBeTruthy();
  const styles = html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? [];
  expect(styles.length).toBeGreaterThan(0);
  // 서버 HTML과 실제 CSS만 사용해 hydration 이전의 반응형 레이아웃을 검증한다.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(`<base href="http://localhost:3000">${styles.join("")}${nav}`);
  const toc = page.getByRole("navigation", { name: "목차" });
  await expect(toc.getByRole("list")).toBeVisible();
  await expect(toc.getByRole("button")).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(toc.locator("ol")).toBeHidden();
  await expect(toc.getByRole("button", { name: "목차" })).toHaveAttribute("aria-expanded", "false");
});

test("모바일 목차 키보드 토글과 화면 크기 전환을 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PATH);
  const toc = page.getByRole("navigation", { name: "목차" });
  const toggle = toc.getByRole("button", { name: "목차" });
  await expect(toc.locator("ol")).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toc.getByRole("list")).toBeVisible();
  await toc.getByRole("link").first().click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toc.locator("ol")).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(toc.getByRole("list")).toBeVisible();
  await expect(toggle).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(toc.locator("ol")).toBeHidden();
});
