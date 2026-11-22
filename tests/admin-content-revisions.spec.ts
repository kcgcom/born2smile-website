import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const ID = "00000000-0000-4000-8000-000000000001";
const CONTENT = { title: "수정 전 원본 제목", subtitle: "원본의 충분한 길이 부제입니다", excerpt: "원본 요약을 확인하기 위한 충분한 길이의 설명입니다.", category: "implant", tags: [], blocks: [{ type: "paragraph", text: "수정 전 원본에 작성된 충분한 길이의 설명입니다." }] };
async function openRevision(page: Page, options: { conflict?: boolean; failApply?: boolean; sourceError?: boolean; applied?: boolean; hold?: Promise<void> } = {}) {
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
  let applied = options.applied ?? false;
  let fail = options.failApply ?? false;
  const writes: unknown[] = [];
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access: { isOwner: true, permissions: ["operations", "content", "staff"] } } });
    if (path.endsWith("/apply") && route.request().method() === "POST") {
      writes.push(route.request().postDataJSON());
      if (options.hold) await options.hold;
      if (fail) return route.fulfill({ status: 409, json: { message: "원본이 변경됐습니다. 최신 원본으로 다시 작성하세요." } });
      applied = true;
      return route.fulfill({ json: { data: { status: "applied" } } });
    }
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, json: { message: "테스트 쓰기 차단" } });
    if (path.endsWith("/source")) {
      if (options.sourceError) return route.fulfill({ status: 503, json: { message: "최신 원본 조회 실패" } });
      return route.fulfill({ json: { data: { revision: options.conflict || applied ? "new-revision" : ID, published: true, date: "2020-01-01" } } });
    }
    return route.fulfill({ json: { data: { id: ID, slug: "revision-example", base_revision: ID, original: CONTENT,
      candidate: { ...CONTENT, title: "수정 후 검토할 제목", blocks: [{ type: "paragraph", text: "수정 후에 추가한 충분한 길이의 설명과 안내입니다." }] },
      reason: "부족했던 환자 안내를 보강합니다.", status: applied ? "applied" : "draft", created_at: "2026-11-15T00:00:00Z" } } });
  });
  await page.goto(`/admin/content/revisions/${ID}`);
  return { writes, succeed: () => { fail = false; } };
}

test("관리자가 수정 전후를 검토하고 동의한 뒤 한 번만 반영한다", async ({ page }) => {
  const { writes } = await openRevision(page);
  await expect(page.getByRole("navigation", { name: "운영 세부 화면", exact: true }).getByRole("link", { name: "포스트", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "수정 후 검토할 제목", exact: true })).toBeVisible();
  const apply = page.getByRole("button", { name: "검토한 수정안 반영", exact: true });
  await expect(apply).toBeDisabled();
  await page.getByRole("button", { name: "수정 전", exact: true }).click();
  await expect(page.getByRole("heading", { name: CONTENT.title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "수정 후", exact: true }).click();
  await page.getByRole("checkbox").check();
  await apply.click();
  await expect(page.getByRole("status").filter({ hasText: "수정안을 반영했습니다." })).toBeVisible();
  await expect(apply).toHaveCount(0);
  expect(writes).toEqual([{ confirm: true }]);
});

for (const mode of ["conflict", "sourceError", "applied"] as const) {
  test(`${mode} 상태에서는 수정안을 반영하지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { writes } = await openRevision(page, { [mode]: true });
    const apply = page.getByRole("button", { name: "검토한 수정안 반영", exact: true });
    if (mode === "applied") await expect(apply).toHaveCount(0);
    else {
      await expect(page.getByText(mode === "conflict" ? /원본이 변경됐습니다/ : "최신 원본 조회 실패")).toBeVisible();
      await expect(apply).toBeDisabled();
    }
    expect(writes).toHaveLength(0);
  });
}

test("반영 요청이 충돌하면 오류와 수정안을 유지한다", async ({ page }) => {
  const { writes } = await openRevision(page, { failApply: true });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "검토한 수정안 반영", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "원본이 변경됐습니다" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "수정 후 검토할 제목", exact: true })).toBeVisible();
  expect(writes).toHaveLength(1);
});

test("반영 중 확인과 버튼을 잠가 중복 반영을 막는다", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const { writes } = await openRevision(page, { hold });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "검토한 수정안 반영", exact: true }).click();
  await expect(page.getByRole("button", { name: "반영 중…", exact: true })).toBeDisabled();
  await expect(page.getByRole("checkbox")).toBeDisabled();
  expect(writes).toHaveLength(1);
  release();
  await expect(page.getByRole("status").filter({ hasText: "수정안을 반영했습니다." })).toBeVisible();
});
