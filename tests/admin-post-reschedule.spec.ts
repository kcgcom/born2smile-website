import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const POST = { slug: "schedule-test", title: "발행일 변경 테스트", subtitle: "테스트 부제", excerpt: "발행일 변경을 확인하는 테스트입니다.", category: "prosthetics", tags: [], date: "2099-12-20", readTime: "1분", published: true };
async function openPosts(page: Page, hold?: Promise<void>) {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!publicUrl) throw new Error("브라우저 편집 테스트에 NEXT_PUBLIC_SUPABASE_URL이 필요합니다.");
  const cookieName = `sb-${new URL(publicUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript((name) => {
    const session = {
      access_token: "test-only-access-token", refresh_token: "test-only-refresh-token",
      token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
      user: { id: "00000000-0000-4000-8000-000000000001", email: "citation-test@example.invalid", app_metadata: {}, user_metadata: {} },
    };
    const value = `${name}=base64-${btoa(JSON.stringify(session)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    // Client-side session double only: don't install a real cookie or send a
    // fabricated credential to the server/Supabase authentication service.
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => [cookie.get?.call(document), value].filter(Boolean).join("; "),
      set: (next: string) => { if (!next.startsWith(name)) cookie.set?.call(document, next); },
    });
    localStorage.setItem("born2smile-admin", "1");
  }, cookieName);
  // The local proxy checks cookie presence only. This marker is not a credential.
  await page.context().addCookies([{ name: "sb-ui-test-auth-token", value: "test-marker", domain: "localhost", path: "/" }]);
  await page.route("**/*.supabase.co/**", route => route.abort());
  let fail = true;
  const writes: { date: string }[] = [];
  let stored = { ...POST };
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true } });
    if (path === "/api/admin/blog-posts/schedule-test" && route.request().method() === "PUT") {
      writes.push(route.request().postDataJSON());
      if (hold) await hold;
      if (fail) return route.fulfill({ status: 503, json: { message: "테스트: 날짜를 저장하지 못했습니다." } });
      stored = { ...stored, ...route.request().postDataJSON() };
      return route.fulfill({ json: { data: { slug: stored.slug } } });
    }
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, json: { message: "테스트 쓰기 차단" } });
    const data = path.endsWith("/blog-posts") ? [stored, { ...POST, slug: "second-post", title: "다른 예약 포스트" }]
      : path.endsWith("/blog-feedback") ? { feedback: {}, totalResponses: 0 }
      : path.endsWith("/schedule") ? { publishDays: [1, 3, 5] } : stored;
    return route.fulfill({ json: { data } });
  });
  await page.goto("/admin/content/posts");
  const row = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: POST.title, exact: true }) });
  await row.getByRole("button", { name: "상세", exact: true }).click();
  await row.getByRole("button", { name: "발행일 변경", exact: true }).click();
  return { row, writes, succeed: () => { fail = false; } };
}

test("발행일 저장 실패는 오류와 입력값을 유지하고 재시도로 복구한다", async ({ page }) => {
  const { row, writes, succeed } = await openPosts(page);
  const date = row.locator('input[type="date"]');
  await date.fill("2099-12-21");
  await row.getByRole("button", { name: "저장", exact: true }).click();
  await expect(row.getByRole("alert")).toContainText("테스트: 날짜를 저장하지 못했습니다.");
  await expect(date).toHaveValue("2099-12-21");
  await expect(row.getByText(POST.date, { exact: true })).toBeVisible();
  await date.fill("2099-12-22");
  await expect(row.getByRole("alert")).toHaveCount(0);
  succeed();
  await date.press("Enter");
  await expect(date).toHaveCount(0);
  await expect(row.getByText("2099-12-22", { exact: true })).toBeVisible();
  expect(writes).toEqual([{ date: "2099-12-21" }, { date: "2099-12-22" }]);
});

test("실패 후 취소하거나 다른 포스트를 편집하면 이전 오류를 지운다", async ({ page }) => {
  const { row } = await openPosts(page);
  await row.locator('input[type="date"]').fill("2099-12-21");
  await row.getByRole("button", { name: "저장", exact: true }).click();
  await expect(row.getByRole("alert")).toBeVisible();
  await row.getByRole("button", { name: "취소", exact: true }).click();
  await row.getByRole("button", { name: "발행일 변경", exact: true }).click();
  await expect(row.locator('input[type="date"]')).toHaveValue(POST.date);
  await expect(row.getByRole("alert")).toHaveCount(0);
  await row.getByRole("button", { name: "저장", exact: true }).click();
  await expect(row.getByRole("alert")).toBeVisible();
  const other = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "다른 예약 포스트", exact: true }) });
  await other.getByRole("button", { name: "상세", exact: true }).click();
  await other.getByRole("button", { name: "발행일 변경", exact: true }).click();
  await expect(page.getByRole("listitem").getByRole("alert")).toHaveCount(0);
  await expect(other.locator('input[type="date"]')).toHaveValue(POST.date);
});

test("저장 중 날짜 입력과 취소를 잠그고 중복 요청을 막는다", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const { row, writes } = await openPosts(page, hold);
  const date = row.locator('input[type="date"]');
  await date.fill("2099-12-21");
  await date.press("Enter");
  await expect.poll(() => writes.length).toBe(1);
  await expect(date).toBeDisabled();
  await expect(row.getByRole("button", { name: "취소", exact: true })).toBeDisabled();
  await expect(row.getByRole("button", { name: "저장 중...", exact: true })).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  expect(writes).toHaveLength(1);
  release();
  await expect(row.getByRole("alert")).toBeVisible();
  await expect(date).toBeEnabled();
  await expect(date).toHaveValue("2099-12-21");
});
