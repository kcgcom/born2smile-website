import { expect, test } from "@playwright/test";
import { interceptAnalytics } from "./helpers/blog-analytics";

// PostHog excludes the default HeadlessChrome user agent.
test.use({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" });

test("관리자 플래그가 있는 공개 방문을 제외하고 플래그를 지운 뒤 집계한다", async ({ page }) => {
  test.setTimeout(50_000);
  const { events } = await interceptAnalytics(page);
  const gaDisabled = () => page.evaluate(() => {
    return Reflect.get(window, "ga-disable-G-3ZDMMFGP6Z") === true;
  });
  const question = page.locator("summary").filter({ hasText: "임플란트 수술은 아프나요?" });
  await page.addInitScript(() => {
    if (new URLSearchParams(location.search).has("admin-flag")) {
      localStorage.setItem("born2smile-admin", "1");
    }
  });

  await page.goto("/staff/login");
  expect(await gaDisabled()).toBe(true);
  await page.goto("/faq?admin-flag=1");
  await question.press("Enter");
  await expect(question.locator("..")).toHaveAttribute("open", "");
  expect(await gaDisabled()).toBe(true);

  await page.evaluate(() => localStorage.removeItem("born2smile-admin"));
  await page.goto("/faq");
  expect(await gaDisabled()).toBe(false);
  await expect.poll(() => events.some(({ event }) => event === "$pageview"), { timeout: 12_000 }).toBe(true);
  await question.press("Enter");
  await expect.poll(() => events.some(({ event }) => event === "faq_opened"), { timeout: 12_000 }).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
  await expect.poll(() => events.some(({ event, properties }) =>
    event === "$pageleave" && String(properties.$current_url).endsWith("/faq"),
  ), { timeout: 12_000 }).toBe(true);
  expect(events.filter(({ properties }) => {
    const url = String(properties.$current_url);
    return url.includes("/staff/login") || url.includes("admin-flag=1");
  })).toEqual([]);
});

test("FAQ 펼침을 기록하고 같은 질문을 두 화면에서 구분한다", async ({ page }) => {
  test.setTimeout(50_000);
  const { events } = await interceptAnalytics(page);
  const opens = () => events.filter(event => event.event === "faq_opened");
  const question = page.locator("summary").filter({ hasText: "임플란트 수술은 아프나요?" });
  const answer = page.getByText("국소마취 하에 진행되므로 시술 중 통증은 거의 없습니다.", { exact: false });
  await page.goto("/faq");
  await expect.poll(() => events.some(event => event.event === "$pageview"), { timeout: 12_000 }).toBe(true);
  expect(opens()).toHaveLength(0);
  await question.press("Enter");
  await expect(answer).toBeVisible();
  await expect.poll(() => opens().length, { timeout: 12_000 }).toBe(1);
  const first = opens()[0].properties;
  expect(first).toMatchObject({ faq_id: "faq-01", surface: "faq", page_path: "/faq" });
  expect(JSON.stringify(first)).not.toContain("임플란트 수술은 아프나요?");
  await question.press("Enter");
  await expect(answer).toBeHidden();

  await page.goto("/treatments/implant");
  await question.click();
  await expect(answer).toBeVisible();
  await expect.poll(() => opens().length, { timeout: 12_000 }).toBe(2);
  expect(opens()[1].properties).toMatchObject({
    faq_id: first.faq_id,
    surface: "treatment",
    page_path: "/treatments/implant",
  });
});
