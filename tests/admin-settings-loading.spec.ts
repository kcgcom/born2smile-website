import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { SiteHours } from "../lib/site-config-supabase";
import type { EmergencyNotice } from "../lib/emergency-notice";

const FIXTURES = {
  clinic: { name: "테스트 치과", nameEn: "Test Clinic", slogan: "테스트 슬로건", phone: "031-000-0000", address: "경기도 김포시 테스트로 123, 테스트빌딩 2층 진료실 201호", addressShort: "김포", neighborhood: "김포", representative: "테스트", businessNumber: "000-00-00000" },
  hours: { schedule: [
    { day: "월요일", open: true, time: "09:30 - 18:30" },
    { day: "수요일", open: false, time: "휴진" },
    { day: "일요일", open: false, time: "휴진" },
  ], exceptions: [], lunchTime: "13:00 - 14:00", closedDays: "수요일, 일요일", notice: "테스트 공지" },
  links: { kakaoChannel: "", instagram: "", naverBlog: "", naverMap: "", kakaoMap: "" },
};
const TITLES = { clinic: "병원 정보", hours: "진료시간", links: "SNS 링크" };
type Section = keyof typeof FIXTURES;

async function openSettings(page: Page, section: Section, initial: "error" | "empty" | "success" = "error", holdWrite?: Promise<void>, isOwner = true, staffWorkspace = !isOwner, hours: SiteHours = FIXTURES.hours) {
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
  let emergencyNotice: EmergencyNotice | null = null;
  const fixtures = structuredClone({ ...FIXTURES, hours });
  let failWrite = false;
  await page.route("**/api/admin/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access: { isOwner } } });
    if (path.endsWith("/search-console")) return route.fulfill({ json: { data: null } });
    if (path.endsWith("/blog-posts")) return route.fulfill({ json: { data: [] } });
    if (path.endsWith("/blog-feedback")) return route.fulfill({ json: { data: { feedback: {}, totalResponses: 0 } } });
    if (path.endsWith("/emergency-notice")) {
      const method = route.request().method();
      if (method === "PUT") emergencyNotice = route.request().postDataJSON();
      if (method === "DELETE") emergencyNotice = null;
      return route.fulfill({ json: { data: { notice: emergencyNotice } } });
    }
    const key = path.split("/").at(-1) as Section;
    if (route.request().method() === (staffWorkspace ? "PATCH" : "PUT") && key === section) {
      const submitted = route.request().postDataJSON();
      writes.push(submitted);
      if (holdWrite) await holdWrite;
      if (failWrite) return route.fulfill({ status: 503, json: { message: "테스트 저장 실패" } });
      Object.assign(fixtures[key], submitted);
      return route.fulfill({ json: { data: submitted } });
    }
    if (route.request().method() !== "GET") return route.fulfill({ status: 400, json: { message: "테스트 쓰기 차단" } });
    requests.push(key);
    if (key === section && state === "error") return route.fulfill({ status: 503, json: { message: "테스트 조회 실패" } });
    if (key === section && state === "empty") return route.fulfill({ json: { data: null } });
    return route.fulfill({ json: { data: fixtures[key] ?? {} } });
  });
  await page.goto(staffWorkspace ? "/staff/system/settings" : "/admin/system/settings");
  return { requests, writes, failSave: () => { failWrite = true; }, setState: (next: typeof state) => { state = next; } };
}

for (const isOwner of [true, false]) {
  test(`${isOwner ? "관리자" : "직원"} 설정에서 긴급 공지를 미리보고 게시한 뒤 내린다`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-30T15:00:00Z"));
    await openSettings(page, "hours", "success", undefined, isOwner);
    const card = page.getByRole("region", { name: "긴급 공지" });
    await card.getByLabel("공지 문구").fill("방문 전 전화로 문의해 주세요.");
    await card.getByLabel("종료 시각 (한국 시간)").fill("2026-12-01T18:00");
    await expect(card.getByText("미리보기")).toBeVisible();
    const payload = page.waitForRequest(request => request.url().endsWith("/api/admin/emergency-notice") && request.method() === "PUT");
    await card.getByRole("button", { name: "즉시 게시" }).click();
    expect((await payload).postDataJSON()).toEqual({
      message: "방문 전 전화로 문의해 주세요.",
      expiresAt: "2026-12-01T18:00:00+09:00",
    });
    await expect(card.getByText("게시된 공지")).toBeVisible();
    await card.getByRole("button", { name: "지금 내리기" }).click();
    await expect(card.getByText("긴급 공지를 내렸습니다.")).toBeVisible();
    await expect(card.getByText("게시된 공지")).toHaveCount(0);
  });
}

test("공개 긴급 공지는 종료 시각에 다시 로드하지 않아도 사라진다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-12-01T08:59:00Z") });
  await page.route("**/api/emergency-notice", route => route.fulfill({
    json: { notice: { message: "방문 전 전화로 문의해 주세요.", expiresAt: "2026-12-01T18:00:00+09:00" } },
  }));
  await page.goto("/contact");
  const banner = page.getByRole("complementary", { name: "긴급 공지" });
  await expect(banner).toContainText("방문 전 전화로 문의해 주세요.");
  await page.clock.fastForward(61_000);
  await expect(banner).toHaveCount(0);
});

test("휴진일 달력은 기본 요일보다 날짜별 운영 예외를 우선해 표시한다", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-30T15:00:00Z"));
  await openSettings(page, "hours", "success", undefined, false, true, {
    ...FIXTURES.hours,
    schedule: [
      { day: "수요일", open: true, time: "09:30 - 18:30" },
      { day: "목요일", open: false, time: "휴진" },
      { day: "일요일", open: true, time: "09:30 - 18:30" },
    ],
    exceptions: [
      { date: "2026-12-02", open: false, time: "휴진" },
      { date: "2026-12-03", open: true, time: "10:00 - 15:00" },
    ],
  });
  await page.goto("/staff/system/hours");
  await expect(page).toHaveURL("/staff/system/settings#staff-hours");
  const calendar = page.getByRole("region", { name: "휴진일 달력" });
  for (const label of ["2026년 12월 2일 휴진", "2026년 12월 10일 정기 휴진"]) {
    await expect(calendar.getByRole("button", { name: label, exact: true })).toHaveClass(/\btext-red-700\b/);
  }
  for (const label of ["2026년 12월 3일 정상진료", "2026년 12월 6일", "2026년 12월 9일"]) {
    await expect(calendar.getByRole("button", { name: label, exact: true })).not.toHaveClass(/\btext-red-700\b/);
  }
});

for (const { role, isOwner } of [{ role: "스태프", isOwner: false }, { role: "원장", isOwner: true }]) {
  test(`${role} 계정의 스태프 화면은 기본 설정을 조회하고 예외 일정만 저장한다`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.clock.setFixedTime(new Date("2026-11-30T15:00:00Z"));
    const { requests, writes } = await openSettings(page, "hours", "success", undefined, isOwner, true);
    const clinic = settingsSection(page, "clinic");
    await expect(clinic.getByText(FIXTURES.clinic.name, { exact: true })).toBeVisible();
    await expect(clinic.getByRole("button", { name: "편집", exact: true })).toHaveCount(0);
    const hoursSummary = page.getByRole("region", { name: "진료시간", exact: true });
    await expect(hoursSummary.getByText(FIXTURES.hours.schedule[0].time, { exact: true })).toBeVisible();
    const draftKey = "born2smile-settings-recovery:/api/admin/site-config/hours:patch";
    await page.evaluate(({ key, baseline }) => {
      sessionStorage.setItem(key, JSON.stringify({
        baseline: JSON.stringify(baseline),
        form: { ...baseline, exceptions: [{ date: "2026-12-15", open: false, time: "휴진" }] },
      }));
    }, { key: draftKey, baseline: FIXTURES.hours });
    await page.reload();
    const nav = page.getByRole("navigation", { name: "직원 업무 메뉴" });
    const home = nav.getByRole("link", { name: "홈", exact: true });
    const blog = nav.getByRole("link", { name: "블로그 공유", exact: true });
    await expect(home).toHaveAttribute("aria-current", "page");
    const hours = page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: "예외 일정", exact: true }) });
    await expect(hours.getByRole("heading", { name: "예외 일정", exact: true })).toHaveCount(1);
    await expect(hours.getByText("특정 날짜 휴진, 단축 진료, 추가 진료 같은 예외 운영을 등록합니다", { exact: true })).toBeVisible();
    await expect(hours.getByText(FIXTURES.hours.schedule[0].time, { exact: true })).toHaveCount(0);
    await expect(hours.getByRole("button", { name: "편집", exact: true })).toHaveCount(0);
    await expect(hours.getByRole("button", { name: "예외 일정 추가", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "SNS 링크", exact: true })).toHaveCount(0);
    expect(requests).not.toContain("links");
    const calendar = page.getByRole("region", { name: "휴진일 달력" });
    await expect(hours.getByRole("region", { name: "휴진일 달력" })).toHaveCount(0);
    await expect(calendar.getByText("2026년 12월", { exact: true })).toBeVisible();
    await expect(calendar.getByText("저장을 눌러야 서버에 반영됩니다.")).toHaveCount(0);
    await expect(hours.getByText("저장을 눌러야 서버에 반영됩니다.")).toHaveCount(0);
    await expect(calendar.getByRole("button", { name: "2026년 12월 15일", exact: true })).toBeEnabled();
    expect(await page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull();
    await page.setViewportSize({ width: 1280, height: 900 });
    const desktopClinic = (await clinic.boundingBox())!;
    const desktopSummary = (await hoursSummary.boundingBox())!;
    const desktopCalendar = (await calendar.boundingBox())!;
    expect(desktopClinic.x).toBe(desktopSummary.x);
    expect(desktopCalendar.x).toBeGreaterThan(desktopSummary.x + desktopSummary.width);
    expect(desktopCalendar.y).toBe(desktopClinic.y);
    await page.setViewportSize({ width: 360, height: 640 });
    const calendarBox = await calendar.boundingBox();
    const hoursBox = await hours.boundingBox();
    const mobileSummary = (await hoursSummary.boundingBox())!;
    expect(mobileSummary.y + mobileSummary.height).toBeLessThanOrEqual(calendarBox!.y);
    expect(calendarBox!.y + calendarBox!.height).toBeLessThanOrEqual(hoursBox!.y);
    expect(calendarBox!.width).toBeGreaterThan(hoursBox!.width);
    const dateBox = await calendar.getByRole("button", { name: "2026년 12월 15일", exact: true }).boundingBox();
    expect(dateBox!.width).toBeGreaterThanOrEqual(44);
    expect(dateBox!.height).toBeGreaterThanOrEqual(64);
    for (const label of ["이전 달", "다음 달"]) {
      const arrow = calendar.getByRole("button", { name: label });
      await expect(arrow.locator("svg")).toBeVisible();
      await expect(arrow).toHaveClass(/\btext-slate-800\b/);
      const box = await arrow.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
    for (const day of [2, 6]) {
      await expect(calendar.getByRole("button", { name: `2026년 12월 ${day}일 정기 휴진`, exact: true })).toHaveClass(/\btext-red-700\b/);
    }
    await calendar.getByRole("button", { name: "다음 달" }).click();
    await expect(calendar.getByText("2027년 1월", { exact: true })).toBeVisible();
    await calendar.getByRole("button", { name: "이전 달" }).click();
    await calendar.getByRole("button", { name: "이전 달" }).click();
    await expect(calendar.getByRole("heading", { name: "2026년 11월" })).toBeVisible();
    await calendar.getByRole("button", { name: "다음 달" }).click();
    const regularClosure = calendar.getByRole("button", { name: "2026년 12월 2일 정기 휴진", exact: true });
    const regularOpening = calendar.getByRole("button", { name: "2026년 12월 2일 정상진료", exact: true });
    await regularClosure.click();
    await expect(regularOpening).toHaveAttribute("aria-pressed", "true");
    await expect(hours.getByText(FIXTURES.hours.schedule[0].time, { exact: false })).toBeVisible();
    await regularOpening.click();
    await expect(regularClosure).toHaveClass(/\btext-red-700\b/);
    await expect(hours.getByRole("button", { name: "저장", exact: true })).toHaveCount(0);
    const availableDate = calendar.getByRole("button", { name: "2026년 12월 25일", exact: true });
    const closedDate = calendar.getByRole("button", { name: "2026년 12월 25일 휴진", exact: true });
    const followingWeek = calendar.getByRole("button", { name: "2026년 12월 28일", exact: true });
    const dayOffset = await availableDate.getByText("25", { exact: true }).evaluate(node => (node as HTMLElement).offsetTop);
    const followingWeekOffset = await followingWeek.evaluate(node => (node as HTMLElement).offsetTop);
    await availableDate.click();
    await expect(closedDate).toHaveAttribute("aria-pressed", "true");
    expect(await closedDate.getByText("25", { exact: true }).evaluate(node => (node as HTMLElement).offsetTop)).toBe(dayOffset);
    expect(await followingWeek.evaluate(node => (node as HTMLElement).offsetTop)).toBe(followingWeekOffset);
    await expect(hours.getByRole("status")).toHaveText("저장을 눌러야 서버에 반영됩니다.");
    expect(await page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull();
    await closedDate.click();
    await expect(availableDate).toHaveAttribute("aria-pressed", "false");
    await expect(hours.getByRole("button", { name: "저장", exact: true })).toHaveCount(0);
    expect(writes).toHaveLength(0);
    expect(await page.evaluate(key => sessionStorage.getItem(key), draftKey)).toBeNull();
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
    await blog.click();
    await expect(page).toHaveURL("/staff/content/posts");
    expect(dialogs).toHaveLength(0);
    await home.click();
    await availableDate.click();
    await hours.getByRole("button", { name: "저장", exact: true }).click();
    await expect(hours.getByRole("status")).toHaveText("저장 완료");
    expect(writes).toEqual([{ exceptions: [{ date: "2026-12-25", open: false, time: "휴진", note: "" }] }]);
    await closedDate.click();
    await expect(availableDate).toHaveAttribute("aria-pressed", "false");
    await availableDate.click();
    await expect(closedDate).toHaveAttribute("aria-pressed", "true");
    await expect(hours.getByRole("button", { name: "저장", exact: true })).toHaveCount(0);
    await regularClosure.click();
    await hours.getByRole("button", { name: "저장", exact: true }).click();
    await expect(hours.getByRole("status")).toHaveText("저장 완료");
    expect(writes[1]).toEqual({ exceptions: [
      { date: "2026-12-25", open: false, time: "휴진", note: "" },
      { date: "2026-12-02", open: true, time: FIXTURES.hours.schedule[0].time, note: "" },
    ] });
    const editButtons = hours.getByRole("button", { name: /예외 일정 편집$/ });
    await expect(editButtons).toHaveCount(2);
    const firstEdit = editButtons.nth(0);
    const secondEdit = editButtons.nth(1);
    await expect(firstEdit).toHaveAccessibleName("2026.12.02 예외 일정 편집");
    await expect(secondEdit).toHaveAccessibleName("2026.12.25 예외 일정 편집");
    await expect(firstEdit).toHaveClass(/\btext-slate-800\b/);
    expect((await firstEdit.boundingBox())!.x).toBe((await secondEdit.boundingBox())!.x);
    const unsavedDate = calendar.getByRole("button", { name: "2026년 12월 24일", exact: true });
    await unsavedDate.click();
    await expect(calendar.getByRole("button", { name: "2026년 12월 24일 휴진", exact: true })).toBeVisible();
    await blog.click();
    await expect(page).toHaveURL("/staff/content/posts");
    expect(dialogs).toEqual(["저장하지 않은 변경사항이 있습니다. 이 화면을 나가시겠습니까?"]);
    await home.click();
    await expect(unsavedDate).toHaveAttribute("aria-pressed", "false");
    await expect(closedDate).toHaveAttribute("aria-pressed", "true");
    await expect(regularOpening).toHaveAttribute("aria-pressed", "true");
    expect(writes).toHaveLength(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  });
}

for (const section of ["clinic", "hours", "links"] as const) {
  for (const failure of ["error", "empty"] as const) {
    test(`${TITLES[section]} ${failure} 응답은 오류를 표시하고 재시도로 복구한다`, async ({ page }) => {
      const mock = await openSettings(page, section, failure);
      const alert = page.getByRole("alert").filter({ hasText: TITLES[section] });
      await expect(alert).toBeVisible();
      if (failure === "error") await expect(alert).toContainText("테스트 조회 실패");
      for (const other of ["clinic", "hours", "links"] as const) {
        if (other !== section) await expect(settingsSection(page, other)).toBeVisible();
      }
      const before = mock.requests.filter(key => key === section).length;
      mock.setState("success");
      await alert.getByRole("button", { name: "다시 시도" }).click();
      await expect(alert).toHaveCount(0);
      await expect(settingsSection(page, section)).toBeVisible();
      expect(mock.requests.filter(key => key === section).length).toBeGreaterThan(before);
    });
  }
}

test("편집 중 재조회 실패와 재시도는 입력을 보존한다", async ({ page }) => {
  await page.clock.install();
  const mock = await openSettings(page, "clinic", "success");
  const section = settingsSection(page, "clinic");
  await section.getByRole("button", { name: "편집", exact: true }).click();
  await page.getByRole("textbox", { name: "병원명", exact: true }).fill("저장하지 않은 병원명");
  mock.setState("error");
  // Advance beyond SWR focus throttling and the 30-second request dedupe window.
  await page.clock.fastForward(31_000);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const alert = page.getByRole("alert").filter({ hasText: "병원 정보" });
  await expect(alert).toContainText("테스트 조회 실패");
  await expect(section.getByRole("button", { name: "저장", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("저장하지 않은 병원명");
  mock.setState("success");
  await alert.getByRole("button", { name: "다시 시도" }).click();
  await expect(alert).toHaveCount(0);
  await expect(section.getByRole("button", { name: "저장", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("저장하지 않은 병원명");
});

function settingsSection(page: Page, section: Section) {
  if (section === "clinic") return page.getByRole("region", { name: "병원 정보", exact: true });
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
    if (section === "hours") {
      await expect(card.getByRole("checkbox", { name: "수요일 휴진", exact: true })).toBeChecked();
      const monday = card.getByRole("checkbox", { name: "월요일 휴진", exact: true });
      await expect(monday).not.toBeChecked();
      await monday.check();
    }
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
    if (section === "hours") {
      expect(mock.writes[0].schedule).toEqual([
        { ...FIXTURES.hours.schedule[0], open: false },
        ...FIXTURES.hours.schedule.slice(1),
      ]);
    }
    await card.getByRole("button", { name: "저장", exact: true }).click();
    await expect(card.getByText("저장 완료", { exact: true }).filter({ visible: true })).toBeVisible();
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
  await page.getByRole("link", { name: "운영", exact: true }).click();
  expect(count).toBe(1);
  await page.locator("header summary").click();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  expect(count).toBe(2);
  await expect(page).toHaveURL("/admin/system/settings");
  page.removeAllListeners("dialog");
  page.on("dialog", async dialog => { count++; await dialog.accept(); });
  await page.getByRole("link", { name: "운영", exact: true }).click();
  await expect(page).toHaveURL("/admin/operations/overview");
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
  await expect(settingsSection(page, "clinic")).toBeVisible();
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
    const badge = card.getByText(label, { exact: true }).filter({ visible: true });
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
  await page.getByRole("link", { name: "운영", exact: true }).click();
  await expect(page).toHaveURL("/admin/operations/overview");
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

test("모바일 설정은 병원 정보와 진료시간을 바로 보여주고 편집은 별도로 연다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  const { writes } = await openSettings(page, "clinic", "success");
  await expect(page.getByText("편집 가능", { exact: true })).toHaveCount(0);
  const card = settingsSection(page, "clinic");
  const clinicName = card.getByRole("heading", { name: "테스트 치과", exact: true });
  const clinicPhone = card.getByText("031-000-0000", { exact: true });
  await expect(clinicName).toBeVisible();
  await expect(card.getByText("테스트 치과", { exact: true })).toHaveCount(1);
  await expect(card.getByText("병원 정보", { exact: true })).toHaveCount(0);
  await expect(clinicPhone).toBeVisible();
  const [nameBox, phoneBox] = await Promise.all([clinicName.boundingBox(), clinicPhone.boundingBox()]);
  expect(phoneBox!.y).toBeGreaterThanOrEqual(nameBox!.y + nameBox!.height);
  await expect(card.getByText(FIXTURES.clinic.address, { exact: true })).toBeVisible();
  await expect(card.getByText("대표 테스트", { exact: true })).toBeVisible();
  await expect(card.getByText("000-00-00000", { exact: true })).toBeVisible();
  const infoRows = card.locator("dl > div");
  await expect(infoRows).toHaveCount(3);
  for (const row of await infoRows.all()) {
    const [iconBox, valueBox] = await Promise.all([
      row.locator("dt svg").boundingBox(),
      row.locator("dd").boundingBox(),
    ]);
    expect(iconBox!.width).toBe(12);
    expect(iconBox!.x + iconBox!.width).toBeLessThan(valueBox!.x);
    expect(iconBox!.y + iconBox!.height / 2).toBeCloseTo(valueBox!.y + 10);
  }
  await expect(card.getByText("테스트 슬로건", { exact: true })).toHaveCount(0);
  await expect(card.getByText("김포", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await expect(settingsSection(page, "hours").getByText("09:30 - 18:30", { exact: true })).toBeVisible();
  await expect(settingsSection(page, "links").getByText("인스타그램", { exact: true })).toBeVisible();
  await expect(card.getByRole("textbox", { name: "병원명", exact: true })).toHaveCount(0);
  const edit = card.getByRole("button", { name: "편집", exact: true });
  for (const section of ["clinic", "hours", "links"] as const) {
    const settingsCard = settingsSection(page, section);
    const cardBox = await settingsCard.boundingBox();
    const buttonBox = await settingsCard.getByRole("button", { name: "편집", exact: true }).boundingBox();
    expect(cardBox!.x + cardBox!.width - buttonBox!.x - buttonBox!.width).toBeLessThan(20);
    expect(buttonBox!.y - cardBox!.y).toBeLessThan(20);
    expect(buttonBox!.height).toBe(44);
    expect(buttonBox!.width).toBe(44);
  }
  await edit.click();
  await expect(card.getByRole("textbox", { name: "병원명", exact: true })).toHaveValue("테스트 치과");
  await card.getByRole("textbox", { name: "대표자", exact: true }).fill("미저장 대표자");
  await expect(card.getByRole("button", { name: "저장", exact: true })).toBeInViewport({ ratio: 1 });
  await expect(card.getByRole("status")).toHaveText("저장하지 않은 변경사항이 있습니다.");
  expect(writes).toHaveLength(0);
});

test("모바일 진료시간은 예외 일정을 편집하는 위치에서 저장하고 결과를 확인한다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const mock = await openSettings(page, "hours", "success");
  const schedule = settingsSection(page, "hours");
  const card = page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: "예외 일정", exact: true }) });
  const tabs = page.getByRole("navigation", { name: "시스템 세부 화면" }).getByRole("link");
  await expect(tabs).toHaveCount(5);
  await expect(tabs.first()).toHaveAttribute("aria-current", "page");
  const boxes = await Promise.all((await tabs.all()).map(tab => tab.boundingBox()));
  expect(new Set(boxes.map(box => box!.y)).size).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await card.getByRole("button", { name: "예외 일정 추가", exact: true }).click();
  const date = card.getByLabel("예외 일정 1 날짜");
  await expect(date).toBeFocused();
  await expect(schedule.getByRole("button", { name: "편집", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(schedule.getByLabel("월요일 진료 시간")).toHaveCount(0);
  await date.fill("2026-12-25");
  const note = card.getByRole("textbox", { name: "예외 일정 1 비고" });
  await note.fill("성탄절 휴진");
  const save = card.getByRole("button", { name: "저장", exact: true });
  await expect(save).toBeInViewport({ ratio: 1 });
  await save.click();
  await expect(card.getByRole("status")).toHaveText("저장 완료");
  expect(mock.writes).toHaveLength(1);
  expect(mock.writes[0].schedule).toEqual(FIXTURES.hours.schedule);
  await card.getByRole("button", { name: "예외 일정 편집 닫기", exact: true }).click();
  await expect(date).toHaveCount(0);
  await card.getByRole("button", { name: "2026.12.25 예외 일정 편집", exact: true }).click();
  await expect(date).toBeFocused();
  await note.fill("수정한 휴진 안내");
  mock.failSave();
  await save.click();
  await expect(card.getByRole("status")).toContainText("테스트 저장 실패");
  await expect(note).toHaveValue("수정한 휴진 안내");
});

test("데스크톱 설정은 진료시간과 휴진일을 나란히 표시하고 함께 저장한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.setFixedTime(new Date("2026-11-30T15:00:00Z"));
  const { writes } = await openSettings(page, "hours", "success");
  const clinic = settingsSection(page, "clinic");
  const hours = settingsSection(page, "hours");
  const calendar = page.getByRole("region", { name: "휴진일 달력" });
  const exceptions = page.locator("div.rounded-2xl").filter({ has: page.getByRole("heading", { name: "예외 일정", exact: true }) });
  await expect(clinic).toBeVisible();
  await expect(hours).toBeVisible();
  await expect(calendar).toBeVisible();
  const clinicBox = (await clinic.boundingBox())!;
  const hoursBox = (await hours.boundingBox())!;
  const calendarBox = (await calendar.boundingBox())!;
  expect(clinicBox.x).toBe(hoursBox.x);
  expect(calendarBox.x).toBeGreaterThan(hoursBox.x + hoursBox.width);
  expect(calendarBox.y).toBe(clinicBox.y);

  await hours.getByRole("button", { name: "편집", exact: true }).click();
  await hours.getByLabel("월요일 진료 시간").fill("10:00 - 18:30");
  await calendar.getByRole("button", { name: "2026년 12월 25일", exact: true }).click();
  await exceptions.getByRole("button", { name: "저장", exact: true }).click();
  await expect(exceptions.getByText("저장 완료", { exact: true }).filter({ visible: true })).toBeVisible();
  expect(writes).toEqual([{
    ...FIXTURES.hours,
    schedule: [{ ...FIXTURES.hours.schedule[0], time: "10:00 - 18:30" }, ...FIXTURES.hours.schedule.slice(1)],
    exceptions: [{ date: "2026-12-25", open: false, time: "휴진", note: "" }],
  }]);
});
