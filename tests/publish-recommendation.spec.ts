import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const failSchedule of [false, true]) {
  test(`발행 추천은 ${failSchedule ? "조회 실패를 표시하고 예약을 차단" : "KST 기준으로 점유된 날짜를 건너뜀"}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-12T01:00:00+09:00"));
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ?? readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
    if (!publicUrl) throw new Error("테스트에 공개 Supabase URL이 필요합니다.");
    const cookieName = `sb-${new URL(publicUrl).hostname.split(".")[0]}-auth-token`;
    await page.addInitScript((name) => {
      const session = { access_token: "test-only-access-token", refresh_token: "test-only-refresh-token", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: { id: "00000000-0000-4000-8000-000000000001", email: "schedule-test@example.invalid", app_metadata: {}, user_metadata: {} } };
      const value = `${name}=base64-${btoa(JSON.stringify(session)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
      const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
      Object.defineProperty(document, "cookie", { configurable: true, get: () => [cookie.get?.call(document), value].filter(Boolean).join("; "), set: (next: string) => { if (!next.startsWith(name)) cookie.set?.call(document, next); } });
      localStorage.setItem("born2smile-admin", "1");
    }, cookieName);
    await page.route(`${publicUrl}/**`, (route) => route.abort());
    await page.route("**/api/admin/**", (route) => {
      const pathname = new URL(route.request().url()).pathname;
      // All admin requests are mocked; no writes or fabricated credentials reach the server.
      if (route.request().method() !== "GET") return route.fulfill({ status: 403, json: { message: "테스트 저장 차단" } });
      if (pathname.endsWith("/blog-likes")) return route.fulfill({ json: { data: { likes: {}, totalLikes: 0 } } });
      if (pathname.endsWith("/auth-check")) return route.fulfill({ json: { ok: true } });
      if (pathname.endsWith("/site-config/schedule")) return route.fulfill({ status: failSchedule ? 503 : 200, json: failSchedule ? { message: "일정 조회 실패" } : { data: { publishDays: [1, 3, 5] } } });
      if (pathname.endsWith("/blog-posts")) return route.fulfill({ json: { data: [
        { slug: "schedule-test", title: "일정 검사 원고", subtitle: "", excerpt: "", category: "prevention", tags: [], date: "2026-11-12", published: false, readTime: "1분" },
        { slug: "occupied-date", title: "예약된 글", subtitle: "", excerpt: "", category: "prevention", tags: [], date: "2026-11-13", published: true, readTime: "1분" },
      ] } });
      return route.fulfill({ json: { data: {} } });
    });
    // The local proxy only checks cookie presence; actual client auth stays mocked.
    await page.context().addCookies([{ name: "sb-test-only-auth-token", value: "test-only-presence", url: "http://localhost:3000" }]);
    await page.goto("/admin/content/posts");
    await page.locator("li").filter({ has: page.getByRole("link", { name: "일정 검사 원고", exact: true }) }).getByRole("button", { name: "상세", exact: true }).click();
    await page.getByRole("button", { name: "일정 검사 원고 발행", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "발행", exact: true });
    if (failSchedule) {
      await expect(dialog.getByText(/발행 일정을 확인할 수 없습니다/)).toBeVisible();
      await expect(dialog.getByRole("button", { name: "발행 예약", exact: true })).toBeDisabled();
      await dialog.getByRole("radio", { name: /즉시 발행/ }).check();
      await expect(dialog.getByRole("button", { name: "즉시 발행", exact: true })).toBeEnabled();
    } else {
      await expect(dialog.getByText("추천 날짜: 2026-11-16")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "발행 예약", exact: true })).toBeEnabled();
    }
  });
}
