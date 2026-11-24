import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentPlannerItem, PlannerStatus } from "../lib/content-planner";
import { workStage, internalTarget, workResult } from "../app/admin/(dashboard)/components/planner/work-inbox";

const statuses: PlannerStatus[] = ["deferred", "approved", "in_progress", "review", "scheduled", "published", "dismissed"];
const tasks: ContentPlannerItem[] = statuses.map((status, i) => ({ id: `task-${i}`, opportunityKey: `blog:sample:${i}`, itemType: "blog", title: `${status} 콘텐츠 작업 제목`, category: "implant", targetPage: "/blog/implant/example-post", status, priority: "now", rationale: "환자 질문에 대한 설명을 보강합니다.", brief: { outline: ["진료 후 관리 안내"], checklist: ["설명과 근거 확인"] }, sourceSnapshot: { source: "legacy" }, dueDate: null, createdBy: "test@example.invalid", createdAt: "2026-11-15T00:00:00Z", updatedAt: "2026-11-15T00:00:00Z" }));

async function openInbox(page: Page, initialPath = "/admin/content/tasks", fail = false, initialTasks = tasks) {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? readFileSync(".env.local", "utf8").match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!publicUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL이 필요합니다.");
  const name = `sb-${new URL(publicUrl).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(name => {
    const session = { access_token: "test-only-access-token", refresh_token: "test-only-refresh-token", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user: { id: "00000000-0000-4000-8000-000000000001", email: "test@example.invalid", app_metadata: {}, user_metadata: {} } };
    const value = `${name}=base64-${btoa(JSON.stringify(session)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { configurable: true, get: () => [cookie.get?.call(document), value].filter(Boolean).join("; "), set: next => { if (!next.startsWith(name)) cookie.set?.call(document, next); } });
    localStorage.setItem("born2smile-admin", "1");
  }, name);
  await page.context().addCookies([{ name: "sb-ui-test-auth-token", value: "test-marker", domain: "localhost", path: "/" }]);
  await page.route("**/*.supabase.co/**", route => route.abort());
  const stored = structuredClone(initialTasks);
  const writes: unknown[] = [];
  let failed = fail;
  const calls: string[] = [];
  await page.route("**/api/admin/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push(path);
    if (path.endsWith("auth-check")) return route.fulfill({ json: { ok: true, access: { isOwner: true, permissions: ["operations", "content", "staff"] } } });
    if (request.method() !== "GET") {
      if (request.method() !== "PUT" || !path.startsWith("/api/admin/content-planner/task-")) return route.fulfill({ status: 403, json: { message: "테스트 쓰기 차단" } });
      writes.push(request.postDataJSON());
      if (failed) return route.fulfill({ status: 503, json: { message: "상태 저장 실패" } });
      const item = stored.find(item => item.id === path.split("/").at(-1))!;
      item.status = request.postDataJSON().status;
      return route.fulfill({ json: { data: item } });
    }
    if (path === "/api/admin/content-planner") return route.fulfill({ json: { data: stored } });
    if (initialPath === "/admin/operations/overview" && path !== "/api/admin/blog-posts") {
      return route.fulfill({ status: 503, json: { message: "테스트 자료 없음" } });
    }
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto(initialPath);
  if (initialPath !== "/admin/operations/overview") {
    await expect(page.getByRole("heading", { name: "콘텐츠 작업함", exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "콘텐츠 작업 상태" })).toBeVisible();
  }
  return { writes, calls, succeed: () => { failed = false; } };
}

test("기존 일곱 상태는 누락 없이 네 작업 묶음과 제외 목록으로 매핑한다", () => {
  expect(tasks.map(workStage)).toEqual(["proposals", "working", "working", "review", "review", "done", "archive"]);
  expect(internalTarget("//example.com")).toBeNull();
  expect(internalTarget("javascript:alert(1)")).toBeNull();
  expect(workResult(tasks[0]).postSlug).toBe("example-post");
  expect(workResult({ ...tasks[0], targetPage: "/treatments/implant" }).postSlug).toBeNull();
});

test("기존 작업을 상태별로 표시하고 분석 추천 API를 호출하지 않는다", async ({ page }) => {
  const { calls } = await openInbox(page);
  await expect(page.getByRole("heading", { name: "deferred 콘텐츠 작업 제목" })).toBeVisible();
  await page.getByRole("button", { name: /^작업 중/ }).click();
  await expect(page.getByRole("heading", { name: "approved 콘텐츠 작업 제목" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "in_progress 콘텐츠 작업 제목" })).toBeVisible();
  await page.getByRole("button", { name: /^검토 필요/ }).click();
  await expect(page.getByRole("heading", { name: "scheduled 콘텐츠 작업 제목" })).toBeVisible();
  await page.getByRole("button", { name: /^완료/ }).click();
  await expect(page.getByRole("heading", { name: "published 콘텐츠 작업 제목" })).toBeVisible();
  await page.getByRole("button", { name: /^제외한 작업/ }).click();
  await expect(page.getByRole("heading", { name: "dismissed 콘텐츠 작업 제목" })).toBeVisible();
  expect(calls.some(path => path.includes("trend-summary"))).toBe(false);
});

test("에이전트의 승인 대기·막힌 이유·코드 결과를 작업함에서 확인한다", async ({ page }) => {
  const pending = { ...tasks[0], sourceSnapshot: { taskWorkflow: { version: 1, proposalPending: true } } };
  const blocked = { ...tasks[2], sourceSnapshot: { taskWorkflow: { version: 1, workerId: "content-agent-01", blockedReason: "추가 근거 확인이 필요합니다." } } };
  const result = { kind: "code", summary: "진료 후 관리 설명을 보강했습니다.", files: ["lib/treatments.ts"], pullRequestUrl: "https://github.com/kcgcom/born2smile-website/pull/123" };
  const review = { ...tasks[3], itemType: "page" as const, targetPage: "/treatments/implant", sourceSnapshot: { taskWorkflow: { version: 1, result } } };
  await openInbox(page, undefined, false, [pending, blocked, review]);
  await expect(page.getByText("승인 대기", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^작업 중/ }).click();
  await expect(page.getByText("담당: content-agent-01", { exact: true })).toBeVisible();
  await expect(page.getByText("진행 보류: 추가 근거 확인이 필요합니다.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^검토 필요/ }).click();
  await expect(page.getByRole("link", { name: "코드 변경안 검토 (새 창)" })).toHaveAttribute("href", result.pullRequestUrl);
  await expect(page.getByText("변경 파일: lib/treatments.ts", { exact: true })).toBeVisible();
});

test("오늘 할 일의 건수와 작업함에서 필터한 작업이 일치한다", async ({ page }) => {
  const pending = { ...tasks[0], sourceSnapshot: { taskWorkflow: { proposalPending: true } } };
  const blocked = { ...tasks[2], sourceSnapshot: { taskWorkflow: { blockedReason: "추가 확인이 필요합니다." } } };
  const completed = { ...tasks[5], sourceSnapshot: blocked.sourceSnapshot };
  await openInbox(page, "/admin/operations/overview", false, [pending, blocked, completed, tasks[1]]);
  await page.getByRole("link", { name: "승인 대기 1건" }).click();
  await expect(page.getByRole("list", { name: "콘텐츠 작업 목록" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: pending.title })).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "막힌 작업 1건" }).click();
  await expect(page.getByRole("list", { name: "콘텐츠 작업 목록" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: blocked.title })).toBeVisible();
  await page.getByRole("button", { name: /^작업 중/ }).click();
  await expect(page.getByRole("heading", { name: tasks[1].title })).toBeVisible();
});

test("승인 실패는 작업과 근거를 보존하고 재시도로 상태만 변경한다", async ({ page }) => {
  const mock = await openInbox(page, undefined, true);
  await page.getByRole("button", { name: "승인", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "상태 저장 실패" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "deferred 콘텐츠 작업 제목" })).toBeVisible();
  mock.succeed();
  await page.getByRole("button", { name: "승인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "deferred 콘텐츠 작업 제목" })).toHaveCount(0);
  expect(mock.writes).toEqual([{ status: "approved", baseUpdatedAt: tasks[0].updatedAt }, { status: "approved", baseUpdatedAt: tasks[0].updatedAt }]);
});

test("구 플래너 링크의 기회 식별자를 유지하고 해당 작업 묶음으로 이동한다", async ({ page }) => {
  await openInbox(page, "/admin/content/planner?type=blog&opportunity=blog%3Asample%3A1");
  await expect(page).toHaveURL(/\/admin\/content\/tasks\?/);
  await expect(page.getByRole("button", { name: /^작업 중/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "approved 콘텐츠 작업 제목" })).toBeVisible();
});

test("완료 확인 취소는 저장하지 않고 승인은 공개 콘텐츠를 쓰지 않는다", async ({ page }) => {
  const { writes, calls } = await openInbox(page, "/admin/content/tasks?stage=review");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "결과 확인·완료 처리", exact: true }).click();
  expect(writes).toHaveLength(0);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "결과 확인·완료 처리", exact: true }).click();
  await expect(page.getByRole("heading", { name: "review 콘텐츠 작업 제목" })).toHaveCount(0);
  expect(writes).toEqual([{ status: "published", baseUpdatedAt: tasks[3].updatedAt }]);
  expect(calls.some(path => path.includes("/apply") || path.includes("/blog-posts/"))).toBe(false);
});

for (const width of [360, 1280]) {
  test(`${width}px 작업함은 원본과 수정안에 연결하고 검색 상태를 복원한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openInbox(page, "/admin/content/tasks?stage=working");
    await page.getByRole("searchbox", { name: "작업 검색" }).fill("approved");
    await expect(page.getByRole("link", { name: "포스트 검토", exact: true })).toHaveAttribute("href", "/admin/content/posts/example-post");
    await page.getByText("에이전트 수정안", { exact: true }).click();
    await expect(page.getByText("저장된 수정안이 없습니다.", { exact: true })).toBeVisible();
    await page.getByText("제안 상세·근거", { exact: true }).click();
    await expect(page.getByText("진료 후 관리 안내", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("searchbox", { name: "작업 검색" })).toHaveValue("approved");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`work-inbox-${width}.png`) });
  });
}
