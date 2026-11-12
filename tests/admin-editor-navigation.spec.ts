import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const EDITOR = "/admin/content/posts/navigation-test";
const POST = { slug: "navigation-test", title: "원래 포스트 제목입니다", subtitle: "테스트용 부제입니다", excerpt: "테스트용 요약문입니다. 충분한 길이의 요약을 사용합니다.", category: "prosthetics", tags: [], date: "2026-11-12", published: false, blocks: [{ type: "paragraph", text: "테스트용 본문입니다. 충분한 길이의 본문을 사용합니다." }] };

async function openEditor(page: Page, failSave = false, blocks = POST.blocks) {
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
  let stored = { ...POST, blocks };
  const writes: typeof POST[] = [];
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true } });
    if (path === "/api/admin/blog-posts/navigation-test") {
      if (route.request().method() === "PUT") {
        writes.push(route.request().postDataJSON());
        if (failSave) return route.fulfill({ status: 500, json: { message: "테스트 저장 실패" } });
        stored = { ...stored, ...route.request().postDataJSON() };
        return route.fulfill({ json: { data: { slug: stored.slug } } });
      }
      data = stored;
    } else if (path.endsWith("/blog-posts")) data = [stored];
    else if (path.endsWith("/schedule")) data = { publishDays: [1, 3, 5] };
    return route.fulfill({ json: { data } });
  });
  await page.goto(EDITOR);
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue(POST.title);
  return writes;
}

test("페이지 편집기에서 Escape는 입력을 유지한다", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("저장하지 않은 새 제목");
  await page.keyboard.press("Escape");
  // Give a mistakenly triggered router.push time to finish.
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(EDITOR);
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("저장하지 않은 새 제목");
});

for (const target of ["닫기", "취소", "포스트 목록", "콘텐츠", "미리보기"] as const) {
  test(`미저장 상태에서 ${target} 이탈을 취소하면 입력을 유지한다`, async ({ page }) => {
    await openEditor(page);
    await page.getByRole("textbox", { name: /^제목/ }).fill("저장하지 않은 새 제목");
    const dialogPromise = page.waitForEvent("dialog");
    const action = target === "닫기" || target === "취소"
      ? page.getByRole("button", { name: target, exact: true })
      : page.getByRole("link", { name: target, exact: true });
    const click = action.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("저장하지 않은 변경사항");
    await dialog.dismiss();
    await click;
    await expect(page).toHaveURL(EDITOR);
    await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("저장하지 않은 새 제목");
  });
}

test("뒤로가기 후 재진입하면 같은 탭의 미저장 입력을 복구한다", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("link", { name: "포스트 목록", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
  await page.goBack();
  await page.getByRole("textbox", { name: /^제목/ }).fill("뒤로가기 후 복구할 제목");
  await page.goForward();
  await expect(page).toHaveURL("/admin/content/posts");
  await page.goBack();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("뒤로가기 후 복구할 제목");
  await expect(page.getByText(/미저장 내용을 복구했습니다/)).toBeVisible();
});

test("저장 성공 후에는 이탈 확인이 필요하지 않다", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("저장한 새 포스트 제목");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await expect(page.getByText("초안을 저장했습니다.", { exact: true })).toBeVisible();
  page.on("dialog", dialog => { throw new Error(`저장 후 불필요한 확인: ${dialog.message()}`); });
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
});

test("저장 실패 후에는 이탈 보호를 유지한다", async ({ page }) => {
  await openEditor(page, true);
  await page.getByRole("textbox", { name: /^제목/ }).fill("저장 실패한 포스트 제목");
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await expect(page.getByText("테스트 저장 실패", { exact: true })).toBeVisible();
  const dialogPromise = page.waitForEvent("dialog");
  const click = page.getByRole("button", { name: "닫기", exact: true }).click();
  await (await dialogPromise).dismiss();
  await click;
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("저장 실패한 포스트 제목");
});

test("새로고침을 취소하면 작성 중인 입력이 유지된다", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("새로고침에서 보호할 제목");
  const dialogPromise = page.waitForEvent("dialog");
  const reload = page.reload({ timeout: 2000 }).catch(() => null);
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await reload;
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("새로고침에서 보호할 제목");
});

test("모바일에서도 이탈 확인 후 돌아오면 초안을 복구한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("모바일에서 작성한 제목");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
  await page.goBack();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("모바일에서 작성한 제목");
});

test("입력을 원래 값으로 되돌리면 이탈 확인을 해제한다", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("되돌리기 전 변경값");
  await page.getByRole("textbox", { name: /^제목/ }).fill(POST.title);
  page.on("dialog", dialog => { throw new Error(`원복 후 불필요한 확인: ${dialog.message()}`); });
  await page.getByRole("link", { name: "포스트 목록", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
});

for (const publishMode of ["immediate", "custom"] as const) {
  test(`${publishMode} 발행 후 재저장해도 발행 상태와 날짜를 유지한다`, async ({ page }) => {
    const writes = await openEditor(page);
    await page.getByRole("textbox", { name: /^제목/ }).fill("발행할 때 함께 저장한 제목");
    await page.getByRole("button", { name: "저장 후 발행", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "발행", exact: true });
    if (publishMode === "immediate") {
      await dialog.getByRole("radio", { name: /즉시 발행/ }).check();
    } else {
      await dialog.getByRole("radio", { name: /날짜 직접 선택/ }).check();
      await dialog.locator('input[type="date"]').fill("2099-12-20");
    }
    await dialog.getByRole("button", { name: publishMode === "immediate" ? "즉시 발행" : "발행 예약", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes[0].published).toBe(true);
    if (publishMode === "custom") expect(writes[0].date).toBe("2099-12-20");
    await expect(page.getByRole("button", { name: "변경사항 저장", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "저장 후 발행", exact: true })).toHaveCount(0);
    await expect(page.getByLabel(/^발행일/)).toHaveValue(writes[0].date);
    await expect(page.getByRole("textbox", { name: /^슬러그/ })).toHaveAttribute("readonly", "");
    await expect(page.getByText("저장하지 않은 변경사항이 있습니다.", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => sessionStorage.getItem("born2smile-editor-recovery:navigation-test"))).toBeNull();
    await page.getByRole("textbox", { name: /^제목/ }).fill("발행 후 추가로 수정한 제목");
    await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();
    await expect(page.getByText("발행된 글을 수정했습니다.", { exact: true })).toBeVisible();
    expect(writes[1]).toMatchObject({ published: true, date: writes[0].date, title: "발행 후 추가로 수정한 제목" });
  });
}

for (const outcome of ["cancel", "error"] as const) {
  test(`발행 ${outcome} 후 초안 입력과 미저장 상태를 유지한다`, async ({ page }) => {
    const writes = await openEditor(page, outcome === "error");
    await page.getByRole("textbox", { name: /^제목/ }).fill("실패하거나 취소해도 남을 제목");
    await page.getByRole("button", { name: "저장 후 발행", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "발행", exact: true });
    if (outcome === "error") {
      await dialog.getByRole("radio", { name: /즉시 발행/ }).check();
      await dialog.getByRole("button", { name: "즉시 발행", exact: true }).click();
      await expect(dialog.getByText("테스트 저장 실패", { exact: true })).toBeVisible();
    }
    await dialog.getByRole("button", { name: "취소", exact: true }).click();
    expect(writes).toHaveLength(outcome === "error" ? 1 : 0);
    await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("실패하거나 취소해도 남을 제목");
    await expect(page.getByRole("button", { name: "초안 저장", exact: true })).toBeVisible();
    await expect(page.getByLabel(/^발행일/)).toHaveCount(0);
    await expect(page.getByText("저장하지 않은 변경사항이 있습니다.", { exact: true })).toBeVisible();
  });
}

test("발행 창을 연 뒤 추가한 입력은 보존하고 미저장으로 남긴다", async ({ page }) => {
  const writes = await openEditor(page);
  await page.getByRole("textbox", { name: /^제목/ }).fill("발행 요청에 포함할 제목");
  await page.getByRole("button", { name: "저장 후 발행", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "발행", exact: true });
  // Simulate a later input while the submitted snapshot is pending.
  await page.getByRole("textbox", { name: /^제목/ }).fill("발행 요청 이후 추가한 제목", { force: true });
  await dialog.getByRole("radio", { name: /즉시 발행/ }).check();
  await dialog.getByRole("button", { name: "즉시 발행", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes[0].title).toBe("발행 요청에 포함할 제목");
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("발행 요청 이후 추가한 제목");
  await expect(page.getByText("저장하지 않은 변경사항이 있습니다.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "변경사항 저장", exact: true }).click();
  await expect(page.getByText("발행된 글을 수정했습니다.", { exact: true })).toBeVisible();
  expect(writes[1]).toMatchObject({ published: true, date: writes[0].date, title: "발행 요청 이후 추가한 제목" });
});

const RECOVERY_KEY = "born2smile-editor-recovery:navigation-test";
async function seedConflict(page: Page) {
  await openEditor(page);
  const raw = JSON.stringify({ baseline: JSON.stringify({ ...POST, title: "이전 원본 제목" }), form: { ...POST, title: "복구할 미저장 제목" } });
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: RECOVERY_KEY, value: raw });
  await page.reload();
  await expect(page.getByRole("button", { name: "이전 입력 복구", exact: true })).toBeVisible();
  return raw;
}

test("원본이 달라진 복구본은 재진입해도 보존하며 명시적으로 복구한다", async ({ page }) => {
  const raw = await seedConflict(page);
  await expect(page.getByRole("textbox", { name: /^제목/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "초안 저장", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "이전 입력 복구", exact: true })).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
  await page.getByRole("button", { name: "이전 입력 복구", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue("복구할 미저장 제목");
  await expect(page.getByRole("textbox", { name: /^제목/ })).toBeEnabled();
  await page.getByRole("button", { name: "초안 저장", exact: true }).click();
  await expect(page.getByText("초안을 저장했습니다.", { exact: true })).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), RECOVERY_KEY)).toBeNull();
});

test("복구본 삭제는 확인 후에만 수행하고 현재 원본을 유지한다", async ({ page }) => {
  const raw = await seedConflict(page);
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "이전 입력 삭제", exact: true }).click();
  expect(await page.evaluate(key => sessionStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "이전 입력 삭제", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveValue(POST.title);
  expect(await page.evaluate(key => sessionStorage.getItem(key), RECOVERY_KEY)).toBeNull();
});

for (const width of [1280, 390]) {
  test(`${width}px 긴 글의 저장 버튼은 스크롤 중에도 보이고 첫 오류로 이동한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const writes = await openEditor(page, false, Array.from({ length: 20 }, () => ({ ...POST.blocks[0] })));
    const title = page.getByRole("textbox", { name: /^제목/ });
    await title.fill("짧음");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    const actions = page.getByRole("group", { name: "포스트 저장", exact: true });
    await expect(actions).toBeInViewport();
    const save = actions.getByRole("button", { name: "초안 저장", exact: true });
    await expect(save).toBeInViewport();
    await save.click();
    await expect(title).toBeFocused();
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await expect(title).toBeInViewport();
    await expect(actions.getByRole("alert")).toContainText("1개");
    expect(writes).toHaveLength(0);
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`) });
    await title.fill(POST.title);
    const paragraph = page.getByRole("textbox", { name: "블록 20 문단 텍스트", exact: true });
    await paragraph.fill("짧은 본문");
    await page.evaluate(() => window.scrollTo(0, 700));
    await save.click();
    await expect(paragraph).toBeFocused();
    await expect(paragraph).toBeInViewport();
    await expect(actions).toBeInViewport();
    expect(writes).toHaveLength(0);
  });
}

test("읽을 수 없는 복구본도 자동 삭제하지 않고 편집을 차단한다", async ({ page }) => {
  await openEditor(page);
  const raw = "{invalid-json";
  await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key: RECOVERY_KEY, raw });
  await page.reload();
  await expect(page.getByText(/보관된 이전 입력을 읽을 수 없습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: "이전 입력 복구", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: /^제목/ })).toBeDisabled();
  expect(await page.evaluate(key => sessionStorage.getItem(key), RECOVERY_KEY)).toBe(raw);
});
