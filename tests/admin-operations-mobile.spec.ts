import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const imageName = "very-long-implant-aftercare-guide-image.webp";
const usages = [
  { slug: "public", title: "공개 글", category: "implant", visible: true, hidden: false, published: true },
  { slug: "draft", title: "초안 글", category: "implant", visible: false, hidden: false, published: false },
  { slug: "scheduled", title: "예약 글", category: "implant", visible: false, hidden: false, published: true },
  { slug: "hidden", title: "숨김 글", category: "implant", visible: false, hidden: true, published: true },
];
const images = [0, 1].map(i => ({ path: `blog/${i}/${imageName}`, name: `${i}-${imageName}`, url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/%3E", size: 12000, width: 100, height: 100, format: "webp", createdAt: "2026-11-15T00:00:00Z", usage: usages, isUsed: true, isVisible: true }));

for (const width of [360, 390, 1280]) {
  test(`${width}px 이미지 조작과 전체 정보·상태별 링크·키보드 미리보기`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.route("**/api/admin/images", route => route.fulfill({ json: { data: images } }));
    await page.goto("/admin/content/images");
    const opener = page.getByRole("button", { name: `${images[0].name} 크게 보기`, exact: true });
    await expect(opener).toBeVisible();
    for (const title of ["URL 복사", "삭제"]) {
      const button = page.locator(`[title="${title}"]`).first();
      await expect(button).toBeVisible();
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByText("파일 정보·사용처", { exact: true }).first().click();
    await expect(page.getByText(images[0].path, { exact: true })).toBeVisible();
    for (const [name, href] of [["공개 글", "/blog/implant/public"], ["초안 글", "/admin/preview/implant/draft"], ["예약 글", "/admin/preview/implant/scheduled"], ["숨김 글", "/admin/content/posts/hidden"]]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) }).first()).toHaveAttribute("href", href);
    }
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "다음 이미지", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(images[1].name, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "이전 이미지", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(dialog.getByText(images[0].name, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("복사·삭제 실패는 안내하고 삭제 성공 때만 목록을 갱신한다", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new Error("denied"); } } }));
  let fail = true;
  let remaining = [...images];
  await page.route("**/api/admin/images**", route => {
    if (route.request().method() === "DELETE") {
      if (fail) return route.fulfill({ status: 503, json: { message: "테스트 삭제 실패" } });
      remaining = remaining.slice(1);
      return route.fulfill({ json: { data: {} } });
    }
    return route.fulfill({ json: { data: remaining } });
  });
  await page.goto("/admin/content/images");
  await page.locator('[title="URL 복사"]').first().click();
  await expect(page.getByRole("alert").filter({ hasText: "복사" })).toContainText("복사");
  page.on("dialog", dialog => dialog.accept());
  await page.locator('[title="삭제"]').first().click();
  await expect(page.getByRole("alert").filter({ hasText: "테스트 삭제 실패" })).toContainText("테스트 삭제 실패");
  await expect(page.locator('[title="삭제"]')).toHaveCount(2);
  fail = false;
  await page.locator('[title="삭제"]').first().click();
  await expect(page.locator('[title="삭제"]')).toHaveCount(1);
  await expect(page.getByRole("status").filter({ hasText: "삭제했습니다" })).toContainText("삭제했습니다");
});

test("이미지는 사용 상태를 구분하고 검색·정렬·빈 결과를 복구한다", async ({ page }) => {
  await setup(page);
  const rows = images.map((image, i) => ({ ...image, createdAt: `2026-11-${15 + i}T00:00:00Z` }));
  await page.route("**/api/admin/images", route => route.fulfill({ json: { data: rows } }));
  await page.goto("/admin/content/images");
  const thumbnails = page.getByRole("button", { name: /크게 보기$/ });
  await expect(thumbnails.first()).toHaveAttribute("aria-label", `${rows[1].name} 크게 보기`);
  await expect(page.getByText("공개 · 초안 · 예약 · 숨김", { exact: true }).first()).toBeVisible();
  await page.getByLabel("이미지 정렬", { exact: true }).selectOption("oldest");
  await expect(thumbnails.first()).toHaveAttribute("aria-label", `${rows[0].name} 크게 보기`);
  const search = page.getByRole("searchbox", { name: "이미지 검색" });
  await search.fill("예약 글");
  await expect(thumbnails).toHaveCount(2);
  await search.fill(rows[0].path);
  await expect(thumbnails).toHaveCount(1);
  await search.fill("없는 파일");
  await expect(thumbnails).toHaveCount(0);
  await page.getByRole("button", { name: "조건 초기화", exact: true }).click();
  await expect(thumbnails).toHaveCount(2);
  await expect(page.getByLabel("이미지 정렬", { exact: true })).toHaveValue("newest");
});

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
