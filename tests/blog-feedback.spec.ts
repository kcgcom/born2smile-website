import { expect, test } from "@playwright/test";
import { classifyFeedbackAuth, handleFeedback, type FeedbackAuth } from "../lib/blog-feedback-server";
import { interceptAnalytics } from "./helpers/blog-analytics";

const PATH = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";
const body = { slug: "swallowed-dental-prosthesis-what-to-do", visitorId: "00000000-0000-4000-8000-000000000001", answer: "solved", reason: null };
test.use({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" });

test("서버는 관리자 쿠키·토큰을 모두 확인하고 확인 실패를 저장하지 않는다", async () => {
  const base = { adminEmails: ["admin@example.invalid"], tokens: [], hasSessionCookie: false,
    resolveToken: async () => ({ email: "visitor@example.invalid" }), resolveCookie: async () => ({ email: "admin@example.invalid" }) };
  expect(await classifyFeedbackAuth(base)).toBe("visitor");
  expect(await classifyFeedbackAuth({ ...base, tokens: ["visitor-token"], hasSessionCookie: true })).toBe("admin");
  expect(await classifyFeedbackAuth({ ...base, tokens: ["admin-token"], resolveToken: async () => ({ email: "admin@example.invalid" }) })).toBe("admin");
  expect(await classifyFeedbackAuth({ ...base, hasSessionCookie: true, resolveCookie: async () => null })).toBe("invalid");
  expect(await classifyFeedbackAuth({ ...base, hasSessionCookie: true, resolveCookie: async () => { throw new Error("auth unavailable"); } })).toBe("unavailable");
  expect(await classifyFeedbackAuth({ ...base, adminEmails: [] })).toBe("unavailable");
});

test("관리자·인증 실패·잘못된 입력은 DB 쓰기 전에 차단한다", async () => {
  let writes = 0;
  let auth: FeedbackAuth = "admin";
  const dependencies = { authenticate: async () => auth, publicPost: async () => true,
    save: async () => { writes++; return { id: "response", updated_at: "2026-11-14T00:00:00Z" }; } };
  const request = (payload: unknown = body, origin = "https://www.born2smile.co.kr") => new Request("https://www.born2smile.co.kr/api/blog/feedback", {
    method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(payload),
  });
  expect(await (await handleFeedback(request(), dependencies)).json()).toEqual({ ignored: true });
  for (const state of ["invalid", "unavailable"] as const) {
    auth = state;
    expect((await handleFeedback(request(), dependencies)).status).toBe(state === "invalid" ? 401 : 503);
  }
  auth = "visitor";
  expect((await handleFeedback(request(body, "https://other.invalid"), dependencies)).status).toBe(403);
  expect((await handleFeedback(request({ ...body, answer: "solved", reason: "missing" }), dependencies)).status).toBe(400);
  expect((await handleFeedback(request({ ...body, comment: "허용하지 않는 자유 입력" }), dependencies)).status).toBe(400);
  expect((await handleFeedback(request(), { ...dependencies, publicPost: async () => false })).status).toBe(404);
  expect(writes).toBe(0);
});

test("일반 응답은 식별자를 해시하고 저장 실패를 성공으로 반환하지 않는다", async () => {
  let stored: unknown;
  const request = () => new Request("https://www.born2smile.co.kr/api/blog/feedback", { method: "POST", headers: { origin: "https://www.born2smile.co.kr", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const dependencies = { authenticate: async () => "visitor" as const, publicPost: async () => true,
    save: async (input: unknown) => { stored = input; return { id: "response", updated_at: "2026-11-14T00:00:00Z" }; } };
  const result = await handleFeedback(request(), dependencies);
  expect(result.status).toBe(200);
  expect(stored).toMatchObject({ slug: body.slug, answer: "solved", reason: null, visitorHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(stored).not.toHaveProperty("visitorId");
  const failed = await handleFeedback(request(), { ...dependencies, save: async () => { throw new Error("database unavailable"); } });
  expect(failed.status).toBe(503);
});

test("이유 없이 보낸 미해결 응답도 정상 저장한다", async () => {
  let stored: unknown;
  const request = new Request("https://www.born2smile.co.kr/api/blog/feedback", {
    method: "POST", headers: { origin: "https://www.born2smile.co.kr", "Content-Type": "application/json" },
    body: JSON.stringify({ slug: body.slug, visitorId: body.visitorId, answer: "unresolved" }),
  });
  const result = await handleFeedback(request, {
    authenticate: async () => "visitor", publicPost: async () => true,
    save: async input => { stored = input; return { id: "response", updated_at: "2026-11-14T00:00:00Z" }; },
  });
  expect(result.status).toBe(200);
  expect(stored).toMatchObject({ answer: "unresolved", reason: null });
});

test("과거 이유가 저장된 브라우저에서도 두 답변만 복원한다", async ({ page }) => {
  await interceptAnalytics(page);
  await page.addInitScript(() => localStorage.setItem("born2smile-feedback:swallowed-dental-prosthesis-what-to-do", JSON.stringify({ answer: "unresolved", reason: "missing" })));
  await page.goto(PATH);
  const region = page.getByLabel("질문 해결 피드백", { exact: true });
  await expect(region.getByRole("button", { name: "아직 궁금해요", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.getByRole("button")).toHaveCount(2);
  await expect(region.getByRole("group")).toHaveCount(0);
  await expect(region.getByRole("textbox")).toHaveCount(0);
});

test("본문 하단은 두 답변만 받고 이유 선택·입력 없이 응답을 바꾼다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  const submissions: Array<Record<string, unknown>> = [];
  await page.route("**/api/blog/feedback", route => {
    const payload = route.request().postDataJSON(); submissions.push(payload);
    return route.fulfill({ json: { data: { id: "feedback-one", updatedAt: new Date().toISOString(), answer: payload.answer, reason: payload.reason } } });
  });
  await page.goto(PATH);
  const region = page.getByLabel("질문 해결 피드백", { exact: true });
  await expect(region).toHaveCount(1);
  await region.getByRole("button", { name: "아직 궁금해요", exact: true }).click();
  await expect(region.getByRole("button", { name: "아직 궁금해요", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.getByRole("button")).toHaveCount(2);
  await expect(region.getByRole("group")).toHaveCount(0);
  await expect(region.getByRole("textbox")).toHaveCount(0);
  await region.getByRole("button", { name: "해결됐어요", exact: true }).click();
  await expect(region.getByRole("button", { name: "해결됐어요", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(region.getByRole("group")).toHaveCount(0);
  expect(submissions.map(item => item.answer)).toEqual(["unresolved", "solved"]);
  expect(submissions.every(item => !("reason" in item))).toBe(true);
  expect(new Set(submissions.map(item => item.visitorId)).size).toBe(1);
  await expect.poll(() => events.filter(event => event.event === "blog_question_feedback").length).toBe(2);
  expect(events.filter(event => event.event === "blog_question_feedback").every(event => event.properties.visitorId === undefined && event.properties.reason === undefined)).toBe(true);
  await page.goto("/blog");
  await expect(page.getByRole("button", { name: "좋아요", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("질문 해결 피드백", { exact: true })).toHaveCount(0);
});

test("저장 실패는 응답을 선택된 것으로 표시하거나 분석 이벤트로 보내지 않는다", async ({ page }) => {
  const { events } = await interceptAnalytics(page);
  await page.route("**/api/blog/feedback", route => route.fulfill({ status: 503, json: { message: "저장 실패 테스트" } }));
  await page.goto(PATH);
  const button = page.getByRole("button", { name: "해결됐어요", exact: true });
  await button.click();
  await expect(page.getByText("저장 실패 테스트", { exact: true })).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  expect(events.filter(event => event.event === "blog_question_feedback").length).toBe(0);
});

test("관리자 응답은 브라우저에서도 저장 요청을 보내지 않는다", async ({ page }) => {
  await interceptAnalytics(page);
  let writes = 0;
  await page.route("**/api/blog/feedback", route => { writes++; return route.fulfill({ json: { ignored: true } }); });
  await page.addInitScript(() => localStorage.setItem("born2smile-admin", "1"));
  await page.goto(PATH);
  const button = page.getByRole("button", { name: "해결됐어요", exact: true });
  await expect(button).toBeDisabled();
  await button.dispatchEvent("click");
  expect(writes).toBe(0);
  await expect(page.getByText("관리자 응답은 저장하지 않습니다.", { exact: true })).toBeVisible();
});
