import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const FIXTURES = {
  clinic: { name: "테스트 치과", nameEn: "Test Clinic", slogan: "테스트 슬로건", phone: "031-000-0000", address: "테스트 주소", addressShort: "김포", neighborhood: "김포", representative: "테스트", businessNumber: "000-00-00000" },
  hours: { schedule: [], exceptions: [], lunchTime: "13:00 - 14:00", closedDays: "일요일", notice: "테스트 공지" },
  links: { kakaoChannel: "", instagram: "", naverBlog: "", naverMap: "", kakaoMap: "" },
};
const TITLES = { clinic: "병원 정보", hours: "진료시간", links: "SNS 링크" };
type Section = keyof typeof FIXTURES;

async function openSettings(page: Page, section: Section, initial: "error" | "empty" | "success" = "error", holdWrite?: Promise<void>) {
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
  let state = initial;
  const requests: string[] = [];
  const writes: Record<string, unknown>[] = [];
  const fixtures = structuredClone(FIXTURES);
  let failWrite = false;
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true } });
    if (path.endsWith("/blog-posts")) return route.fulfill({ json: { data: [] } });
    if (path.endsWith("/blog-likes")) return route.fulfill({ json: { data: { likes: {}, totalLikes: 0 } } });
    const key = path.split("/").at(-1) as Section;
    if (route.request().method() === "PUT" && key === section) {
      const submitted = route.request().postDataJSON();
      writes.push(submitted);
      if (holdWrite) await holdWrite;
      if (failWrite) return route.fulfill({ status: 503, json: { message: "테스트 저장 실패" } });
      Object.assign(fixtures, { [key]: submitted });
      return route.fulfill({ json: { data: submitted } });
    }
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, json: { message: "테스트 쓰기 차단" } });
    requests.push(key);
    if (key === section && state === "error") return route.fulfill({ status: 503, json: { message: "테스트 조회 실패" } });
    if (key === section && state === "empty") return route.fulfill({ json: { data: null } });
    return route.fulfill({ json: { data: fixtures[key] ?? {} } });
  });
  await page.goto("/admin/system/settings");
  return { requests, writes, failSave: () => { failWrite = true; }, setState: (next: typeof state) => { state = next; } };
}

for (const section of ["clinic", "hours", "links"] as const) {
  for (const failure of ["error", "empty"] as const) {
    test(`${TITLES[section]} ${failure} 응답은 오류를 표시하고 재시도로 복구한다`, async ({ page }) => {
      const mock = await openSettings(page, section, failure);
      const alert = page.getByRole("alert").filter({ hasText: TITLES[section] });
      await expect(alert).toBeVisible();
      if (failure === "error") await expect(alert).toContainText("테스트 조회 실패");
      for (const other of ["clinic", "hours", "links"] as const) {
        if (other !== section) await expect(page.getByRole("heading", { name: TITLES[other], exact: true })).toBeVisible();
      }
      const before = mock.requests.filter(key => key === section).length;
      mock.setState("success");
      await alert.getByRole("button", { name: "다시 시도" }).click();
      await expect(alert).toHaveCount(0);
      await expect(page.getByRole("heading", { name: TITLES[section], exact: true })).toBeVisible();
      expect(mock.requests.filter(key => key === section).length).toBeGreaterThan(before);
    });
  }
}

test("편집 중 재조회 실패와 재시도는 입력을 보존한다", async ({ page }) => {
  await page.clock.install();
  const mock = await openSettings(page, "clinic", "success");
  const section = page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: "병원 정보", exact: true }) });
  await section.getByRole("button", { name: "편집", exact: true }).click();
  await page.getByRole("textbox", { name: "병원명", exact: true }).fill("저장하지 않은 병원명");
  mock.setState("error");
  // Advance beyond SWR focus throttling and the 30-second request dedupe window.
  await page.clock.fastForward(31_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const alert = page.getByRole("alert").filter({ hasText: "병원 정보" });
  await expect(alert).toContainText("테스트 조회 실패");
  await expect(page.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("저장하지 않은 병원명");
  mock.setState("success");
  await alert.getByRole("button", { name: "다시 시도" }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("저장하지 않은 병원명");
});

function settingsSection(page: Page, section: Section) {
  return page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: TITLES[section], exact: true }) });
}

const EDIT_FIELDS = { clinic: { label: "병원명", key: "name" }, hours: { label: "점심시간", key: "lunchTime" }, links: { label: "인스타그램", key: "instagram" } };
for (const section of ["clinic", "hours", "links"] as const) {
  test(`${TITLES[section]} 저장 도중 추가한 입력을 보존하고 두 번째 저장에 반영한다`, async ({ page }) => {
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const mock = await openSettings(page, section, "success", hold);
    const card = settingsSection(page, section);
    await card.getByRole("button", { name: "편집", exact: true }).click();
    const input = card.getByRole("textbox", { name: EDIT_FIELDS[section].label, exact: true });
    await input.fill("처음 저장할 값");
    await card.getByRole("button", { name: "저장", exact: true }).click();
    await expect.poll(() => mock.writes.length).toBe(1);
    await input.fill("요청 도중 추가한 값");
    release();
    await expect(card.getByRole("button", { name: "저장", exact: true })).toBeEnabled();
    await expect(input).toHaveValue("요청 도중 추가한 값");
    await expect(card.getByText("수정됨", { exact: true })).toBeVisible();
    await expect(card.getByText("저장 완료", { exact: true })).toHaveCount(0);
    expect(mock.writes[0][EDIT_FIELDS[section].key]).toBe("처음 저장할 값");
    await card.getByRole("button", { name: "저장", exact: true }).click();
    await expect(card.getByText("저장 완료", { exact: true })).toBeVisible();
    expect(mock.writes[1][EDIT_FIELDS[section].key]).toBe("요청 도중 추가한 값");
    expect(await page.evaluate(key => sessionStorage.getItem(key), `born2smile-settings-recovery:/api/admin/site-config/${section}`)).toBeNull();
  });
}

test("여러 설정의 메뉴 이탈 확인은 한 번만 표시하며 재진입하면 모두 복구한다", async ({ page }) => {
  await openSettings(page, "clinic", "success");
  for (const section of ["clinic", "links"] as const) {
    const card = settingsSection(page, section);
    await card.getByRole("button", { name: "편집", exact: true }).click();
    await card.getByRole("textbox", { name: EDIT_FIELDS[section].label, exact: true }).fill(`${section} 미저장 값`);
  }
  let count = 0;
  page.on("dialog", async dialog => { count++; await dialog.dismiss(); });
  await page.getByRole("link", { name: "콘텐츠", exact: true }).click();
  expect(count).toBe(1);
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  expect(count).toBe(2);
  await expect(page).toHaveURL("/admin/system/settings");
  page.removeAllListeners("dialog");
  page.on("dialog", async dialog => { count++; await dialog.accept(); });
  await page.getByRole("link", { name: "콘텐츠", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
  expect(count).toBe(3);
  await page.goBack();
  for (const section of ["clinic", "links"] as const) {
    const card = settingsSection(page, section);
    await card.getByRole("button", { name: "편집", exact: true }).click();
    await expect(card.getByRole("textbox", { name: EDIT_FIELDS[section].label, exact: true })).toHaveValue(`${section} 미저장 값`);
  }
});

test("설정 새로고침 취소와 저장 실패는 입력을 보존한다", async ({ page }) => {
  const mock = await openSettings(page, "clinic", "success");
  const card = settingsSection(page, "clinic");
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await card.getByRole("textbox", { name: "병원명", exact: true }).fill("유지할 설정 값");
  const pendingDialog = page.waitForEvent("dialog");
  const reload = page.reload({ timeout: 2000 }).catch(() => null);
  const dialog = await pendingDialog;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await reload;
  mock.failSave();
  await card.getByRole("button", { name: "저장", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("테스트 저장 실패");
  await expect(card.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("유지할 설정 값");
  await expect(card.getByText("수정됨", { exact: true })).toBeVisible();
});

test("설정 충돌 복구본은 원본 확인 전까지 보관한다", async ({ page }) => {
  await openSettings(page, "clinic", "success");
  await expect(page.getByRole("heading", { name: "병원 정보", exact: true })).toBeVisible();
  const key = "born2smile-settings-recovery:/api/admin/site-config/clinic";
  const raw = JSON.stringify({ baseline: "old", form: { ...FIXTURES.clinic, name: "복구할 병원명" } });
  await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key, raw });
  await page.reload();
  const card = settingsSection(page, "clinic");
  await expect(card.getByRole("button", { name: "이전 입력 복구", exact: true })).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBe(raw);
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await expect(card.getByRole("textbox", { name: "병원명", exact: true })).toBeDisabled();
  await card.getByRole("button", { name: "이전 입력 복구", exact: true }).click();
  await expect(card.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("복구할 병원명");
  await expect(card.getByText("수정됨", { exact: true })).toBeVisible();
});

test("상태 배지는 밝은 배경에서 읽을 수 있는 대비를 제공한다", async ({ page }, testInfo) => {
  await openSettings(page, "clinic", "success");
  const card = settingsSection(page, "clinic");
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await card.getByRole("textbox", { name: "병원명", exact: true }).fill("대비 검사 치과");
  const contrast = async (label: string) => {
    const badge = card.getByText(label, { exact: true });
    await expect(badge).toBeVisible();
    return badge.evaluate(node => {
      const style = getComputedStyle(node);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const luminance = (color: string) => {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const rgb = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(x => {
          const n = x / 255;
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const fg = luminance(style.color), bg = luminance(style.backgroundColor);
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    });
  };
  expect(await contrast("수정됨")).toBeGreaterThanOrEqual(4.5);
  await card.screenshot({ path: testInfo.outputPath("settings-dirty.png") });
  await card.getByRole("button", { name: "저장", exact: true }).click();
  expect(await contrast("저장 완료")).toBeGreaterThanOrEqual(4.5);
  await card.screenshot({ path: testInfo.outputPath("settings-saved.png") });
});

test("이전 화면의 늦은 저장 완료가 재진입 후 복구본을 삭제하지 않는다", async ({ page }) => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const mock = await openSettings(page, "clinic", "success", hold);
  const card = settingsSection(page, "clinic");
  await card.getByRole("button", { name: "편집", exact: true }).click();
  const input = card.getByRole("textbox", { name: "병원명", exact: true });
  await input.fill("첫 요청 값");
  await card.getByRole("button", { name: "저장", exact: true }).click();
  await expect.poll(() => mock.writes.length).toBe(1);
  await input.fill("보관할 추가 입력");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("link", { name: "콘텐츠", exact: true }).click();
  await expect(page).toHaveURL("/admin/content/posts");
  await page.goBack();
  await card.getByRole("button", { name: "편집", exact: true }).click();
  await expect(input).toHaveValue("보관할 추가 입력");
  await input.fill("재진입 후 새 입력");
  const response = page.waitForResponse(r => r.url().endsWith("/api/admin/site-config/clinic") && r.request().method() === "PUT");
  release();
  await response;
  // Allow the old mutation's cache revalidation and completion callback to settle.
  await page.waitForTimeout(500);
  await expect(input).toHaveValue("재진입 후 새 입력");
  const raw = await page.evaluate(() => sessionStorage.getItem("born2smile-settings-recovery:/api/admin/site-config/clinic"));
  expect(raw).not.toBeNull();
  expect(JSON.parse(raw!).form.name).toBe("재진입 후 새 입력");
});
