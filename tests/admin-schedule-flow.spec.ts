import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { getTodayKST } from "../lib/date";

const POST = { slug: "schedule-flow", title: "예약 글 검토 동선 테스트", subtitle: "예약 글의 내용을 확인합니다.", excerpt: "예약 글 검토와 날짜 변경을 확인하기 위한 충분한 길이의 요약입니다.", category: "prosthetics", tags: [], date: "2099-12-20", published: true, blocks: [{ type: "paragraph", text: "예약된 포스트의 본문입니다. 내용을 확인하고 날짜를 변경합니다." }] };
async function openSchedule(page: Page, options: { listError?: boolean; policyError?: boolean } = {}) {
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
  let stored = { ...POST };
  let listError = options.listError;
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access: { isOwner: true, permissions: ["operations", "content", "staff"] } } });
    if (path === `/api/admin/blog-posts/${POST.slug}` && method === "PUT") {
      const body = route.request().postDataJSON();
      writes.push(body);
      stored = { ...stored, ...body };
      return route.fulfill({ json: { data: { slug: stored.slug } } });
    }
    // Never let unexpected mutations reach the connected database.
    if (method !== "GET") return route.fulfill({ status: 400, json: { message: "테스트 쓰기 차단" } });
    if (path.endsWith("/blog-posts") && listError) return route.fulfill({ status: 503, json: { message: "일정 조회 실패" } });
    if (path.endsWith("/schedule") && options.policyError) return route.fulfill({ status: 503, json: { message: "정책 조회 실패" } });
    const data = path.endsWith("/blog-posts") ? [stored, { ...POST, slug: "today-post", title: "오늘 공개된 글", date: getTodayKST() }, { ...POST, slug: "draft-post", title: "미발행 초안", published: false }]
      : path.endsWith("/schedule") ? { publishDays: [1, 3, 5] } : stored;
    return route.fulfill({ json: { data } });
  });
  await page.goto("/admin/content/schedule");
  return { writes, recover: () => { listError = false; } };
}

for (const width of [1280, 390]) {
  test(`${width}px 일정에서 예약일을 바꾸고 돌아오면 최신 날짜를 표시한다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const { writes } = await openSchedule(page);
    const card = page.getByRole("article", { name: POST.title, exact: true });
    await expect(card.getByRole("link", { name: "미리보기 (새 창)", exact: true })).toHaveAttribute("href", `/admin/preview/${POST.category}/${POST.slug}`);
    await expect(card.getByRole("link", { name: "공개 페이지 (새 창)", exact: true })).toHaveCount(0);
    const today = page.getByRole("article", { name: "오늘 공개된 글", exact: true });
    await expect(today.getByRole("link", { name: "공개 페이지 (새 창)", exact: true })).toHaveAttribute("href", "/blog/prosthetics/today-post");
    await expect(page.getByRole("article", { name: "미발행 초안", exact: true })).toHaveCount(0);
    await card.getByRole("link", { name: "검토·예약일 변경", exact: true }).click();
    await expect(page).toHaveURL(`/admin/content/posts/${POST.slug}?from=schedule`);
    await page.getByLabel(/^발행일/).fill("2099-12-22");
    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();
    await expect(page.getByText("발행된 글을 수정했습니다.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "발행 일정으로 돌아가기", exact: true }).click();
    await expect(card).toContainText("2099-12-22");
    await expect(card).not.toContainText("2099-12-20");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ date: "2099-12-22", published: true });
  });
}

test("일정 조회 실패를 예약 없음으로 표시하지 않고 재시도로 복구한다", async ({ page }) => {
  const { recover } = await openSchedule(page, { listError: true });
  const error = page.getByRole("alert").filter({ hasText: "발행 일정을 불러오지 못했습니다." });
  await expect(error).toBeVisible();
  await expect(page.getByText("오늘 이후 예약된 글이 없습니다.", { exact: true })).toHaveCount(0);
  recover();
  await error.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByRole("article", { name: POST.title, exact: true })).toBeVisible();
});

test("요일 정책 조회 실패 시 저장을 막고 글 일정은 유지한다", async ({ page }) => {
  const { writes } = await openSchedule(page, { policyError: true });
  await expect(page.getByRole("alert").filter({ hasText: "발행 요일 정책을 불러오지 못했습니다." })).toBeVisible();
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeDisabled();
  await expect(page.getByRole("article", { name: POST.title, exact: true })).toBeVisible();
  await expect(page.getByText(/기존 예약일은 바뀌지 않습니다/)).toBeVisible();
  expect(writes).toHaveLength(0);
});
