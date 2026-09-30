import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { BlogBlock } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { normalizeBlogBlocks } from "../lib/blog/normalize-blocks";

// Preview and public pages share InlineBlocksEditor. Exercise that component on
// the public route without bypassing the preview route's server authentication.
const ARTICLE = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";
const QUESTION = "병원에서는 어떤 검사를 하나요?";
const ARTICLE_BLOCKS = normalizeBlogBlocks(BLOG_POSTS_SNAPSHOT.find((post) => post.slug === "swallowed-dental-prosthesis-what-to-do")!.blocks);

async function openEditorWithoutWrites(page: Page, options: { blocks?: BlogBlock[]; researchNotices?: Record<string, string>; openFaq?: boolean; failRead?: boolean; saveStatus?: number; holdSave?: Promise<void> } = {}) {
  const saved: { blocks: BlogBlock[]; [key: string]: unknown }[] = [];
  let storedBlocks = options.blocks ?? ARTICLE_BLOCKS;
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
  // Never let a browser test mutate the connected database. Capture the real UI
  // request, then return a validation response so the edit remains inspectable.
  await page.route("**/api/admin/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/admin/auth-check") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    if (route.request().method() === "GET" && route.request().url().includes("/api/admin/blog-posts/")) {
      if (options.failRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "테스트: 원문 조회에 실패했습니다." }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { blocks: storedBlocks }, researchNotices: options.researchNotices ?? {} }) });
    }
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.continue();
    if (route.request().method() === "PUT" && route.request().url().includes("/blog-posts/")) {
      const body = route.request().postDataJSON();
      saved.push(body);
      if (options.holdSave) await options.holdSave;
      if (options.saveStatus === 200) {
        storedBlocks = body.blocks;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { slug: "swallowed-dental-prosthesis-what-to-do" } }) });
      }
    }
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "테스트: 실제 저장을 차단했습니다." }) });
  });
  await page.goto(ARTICLE);
  await page.getByRole("button", { name: "편집 모드", exact: true }).click();
  if (!options.failRead) {
    await expect(page.getByRole("button", { name: "편집 종료", exact: true })).toBeVisible();
    if (options.openFaq !== false) await page.getByRole("heading", { name: QUESTION, exact: true }).click();
  }
  return saved;
}

test("초안·발행글 공용 인라인 편집기는 발행 상태·날짜·메타데이터를 전송하지 않는다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page);
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  await answer.fill((await answer.inputValue()) + " 저장 경로를 확인하기 위한 테스트 문장입니다.");
  await page.locator("form").filter({ has: answer }).getByRole("button", { name: "저장", exact: true }).click();
  await expect.poll(() => saved.length).toBe(1);
  expect(Object.keys(saved[0])).toEqual(["blocks"]);
  expect(saved[0].blocks.some((block) => block.type === "faq" && block.answer.endsWith("테스트 문장입니다."))).toBe(true);
});

test("상단 저장은 현재 답변과 주석 변경을 포함하고 재진입 시 유지한다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page, { saveStatus: 200 });
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  const nextAnswer = (await answer.inputValue()) + " 상단 저장으로 함께 보존할 문장입니다.";
  await answer.fill(nextAnswer);
  await page.getByText("근거 주석 (1)", { exact: true }).click();
  await page.getByRole("textbox", { name: "근거 설명 제목", exact: true }).fill("현재 편집 중인 근거 제목");
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect.poll(() => saved.length).toBe(1);
  const faq = saved[0].blocks.find((block) => block.type === "faq" && block.question === QUESTION);
  expect(faq).toMatchObject({ answer: nextAnswer, citations: [{ title: "현재 편집 중인 근거 제목" }] });
  expect(saved[0]).not.toHaveProperty("published");
  await expect(page.getByRole("button", { name: "편집 모드", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "편집 모드", exact: true }).click();
  await expect(page.getByRole("button", { name: "편집 종료", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: QUESTION, exact: true }).click();
  await expect(page.getByPlaceholder("답변을 입력하세요", { exact: true })).toHaveValue(nextAnswer);
  await page.getByText("근거 주석 (1)", { exact: true }).click();
  await expect(page.getByRole("textbox", { name: "근거 설명 제목", exact: true })).toHaveValue("현재 편집 중인 근거 제목");
});

test("상단 저장 검증 실패는 요청을 보내지 않고 입력을 유지한다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page, { saveStatus: 200 });
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  const original = await answer.inputValue();
  const invalid = "인용 문장을 제외하고 답변 내용을 새롭게 작성한 상태입니다.";
  await answer.fill(invalid);
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect(page.getByRole("alert").filter({ hasText: "다시 연결" })).toBeVisible();
  expect(saved).toHaveLength(0);
  await expect(answer).toHaveValue(invalid);
  await expect(page.getByRole("button", { name: "편집 종료", exact: true })).toBeVisible();
  await answer.fill(original + " 검증 오류를 고친 뒤 다시 저장합니다.");
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect.poll(() => saved.length).toBe(1);
  await expect(page.getByRole("button", { name: "편집 모드", exact: true })).toBeVisible();
});

test("상단 저장 서버 실패 후 입력을 유지하고 중복 요청 없이 재시도한다", async ({ page }) => {
  let releaseSave = () => {};
  const holdSave = new Promise<void>((resolve) => { releaseSave = resolve; });
  const options = { saveStatus: 400, holdSave };
  const saved = await openEditorWithoutWrites(page, options);
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  const nextAnswer = (await answer.inputValue()) + " 저장 오류가 나도 유지되어야 하는 내용입니다.";
  await answer.fill(nextAnswer);
  const toolbarSave = page.getByRole("button", { name: /^저장(?: 중\.\.\.)?$/ }).first();
  await toolbarSave.click();
  await expect.poll(() => saved.length).toBe(1);
  try {
    await expect(answer).toBeDisabled();
    await expect(toolbarSave).toBeDisabled();
  } finally { releaseSave(); }
  await expect(page.getByRole("alert").filter({ hasText: "실제 저장을 차단" })).toBeVisible();
  await expect(answer).toHaveValue(nextAnswer);
  await expect(answer).toBeEnabled();
  options.saveStatus = 200;
  await toolbarSave.click();
  await expect.poll(() => saved.length).toBe(2);
  expect(saved[1].blocks.some((block) => block.type === "faq" && block.answer === nextAnswer)).toBe(true);
  await expect(page.getByRole("button", { name: "편집 모드", exact: true })).toBeVisible();
});

test("상단 저장은 진행 중인 FAQ 변환 결과도 함께 저장한다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page, { saveStatus: 200 });
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  const original = await answer.inputValue();
  await page.locator("form").filter({ has: answer }).locator("select").selectOption("paragraph");
  const changed = original + " 변환한 문단에서 추가한 내용도 저장합니다.";
  await page.getByPlaceholder("문단 내용", { exact: true }).fill(changed);
  await page.getByRole("button", { name: "저장", exact: true }).first().click();
  await expect.poll(() => saved.length).toBe(1);
  const index = saved[0].blocks.findIndex((block) => block.type === "heading" && block.text === QUESTION);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(saved[0].blocks[index + 1]).toMatchObject({ type: "paragraph", text: changed, citations: [expect.any(Object)] });
  await expect(page.getByRole("button", { name: "편집 모드", exact: true })).toBeVisible();
});

test("비공개 안내는 원문에 섞이지 않으며 반복 저장에서도 원본을 유지한다", async ({ page }) => {
  const callout: BlogBlock = {
    type: "researchCallout", title: "검사와 처치의 연구 근거", description: "관련 지침과 연구 결과를 자세히 정리한 자료입니다.",
    href: "/research/private-research", linkText: "연구 자료 보기",
  };
  const blocks = [...ARTICLE_BLOCKS, callout];
  const saved = await openEditorWithoutWrites(page, { blocks, researchNotices: { [callout.href]: "비공개 또는 미검증 연구 자료입니다. 관리자에게만 표시됩니다." } });
  await expect(page.getByRole("note")).toContainText("비공개");
  const answer = page.getByPlaceholder("답변을 입력하세요", { exact: true });
  await answer.fill((await answer.inputValue()) + " 안내 문구와 원문을 구분하는 테스트입니다.");
  const save = page.locator("form").filter({ has: answer }).getByRole("button", { name: "저장", exact: true });
  for (let index = 0; index < 2; index++) {
    await save.click();
    await expect.poll(() => saved.length).toBe(index + 1);
    expect(saved[index].blocks.find((block) => block.type === "researchCallout")).toEqual(callout);
    expect(Object.keys(saved[index])).toEqual(["blocks"]);
  }
});

test("60개 블록에서 복제를 거부하고 마지막 문단을 유지한다", async ({ page }) => {
  const blocks: BlogBlock[] = Array.from({ length: 60 }, (_, index) => ({
    type: "paragraph", text: `한도검사 문단 ${index + 1}: 기존 내용을 삭제하지 않고 그대로 보존하는 테스트입니다.`,
  }));
  const saved = await openEditorWithoutWrites(page, { blocks, openFaq: false });
  await page.getByText("한도검사 문단 1:", { exact: false }).hover();
  await page.getByRole("button", { name: "복제", exact: true }).first().click();
  await expect(page.getByText("기존 내용을 유지한 채 추가·복제를 중단했습니다.", { exact: false })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^한도검사 문단/ })).toHaveCount(60);
  await expect(page.getByText("한도검사 문단 60:", { exact: false })).toBeVisible();
  expect(saved).toHaveLength(0);
});

test("원문 조회가 실패하면 표시용 본문으로 편집을 시작하지 않는다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page, { failRead: true, openFaq: false });
  await expect(page.getByRole("alert").filter({ hasText: "원문 조회에 실패" })).toBeVisible();
  await expect(page.getByRole("button", { name: "편집 모드", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "편집 종료", exact: true })).toHaveCount(0);
  expect(saved).toHaveLength(0);
});

test("FAQ 변환은 저장 전 취소할 수 있고 저장 시 질문·답변을 별도 블록으로 보존한다", async ({ page }) => {
  const saved = await openEditorWithoutWrites(page);
  const originalAnswer = await page.getByPlaceholder("답변을 입력하세요", { exact: true }).inputValue();
  const convert = async () => {
    const form = page.locator("form").filter({ has: page.getByPlaceholder("답변을 입력하세요", { exact: true }) });
    await form.locator("select").selectOption("paragraph");
    await expect(page.getByPlaceholder("문단 내용", { exact: true })).toHaveValue(originalAnswer);
    await expect(page.getByText("질문은 별도 소제목으로 보존됩니다.", { exact: false })).toBeVisible();
    expect(saved).toHaveLength(0);
  };
  await convert();
  await page.locator("form").filter({ has: page.getByPlaceholder("문단 내용", { exact: true }) }).getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByRole("heading", { name: QUESTION, exact: true })).toBeVisible();
  expect(saved).toHaveLength(0);
  await page.getByRole("heading", { name: QUESTION, exact: true }).click();
  await convert();
  await page.locator("form").filter({ has: page.getByPlaceholder("문단 내용", { exact: true }) }).getByRole("button", { name: "저장", exact: true }).click();
  await expect.poll(() => saved.length).toBe(1);
  const headingIndex = saved[0].blocks.findIndex((block) => block.type === "heading" && block.text === QUESTION);
  expect(headingIndex).toBeGreaterThanOrEqual(0);
  const answer = saved[0].blocks[headingIndex + 1];
  expect(answer.type).toBe("paragraph");
  if (answer.type !== "paragraph") throw new Error("Expected paragraph");
  expect(answer.text).toBe(originalAnswer);
  expect(answer.citations).toHaveLength(1);
  expect(Object.keys(saved[0])).toEqual(["blocks"]);
});
