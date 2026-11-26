import { expect, test } from "@playwright/test";
import { setupOutcomes } from "./helpers/admin-outcomes";

const form = {
  id: "00000000-0000-4000-8000-000000000001",
  insurer: "예시손해보험",
  title: "치과치료확인서",
  createdAt: "2026-11-26T05:00:00.000Z",
};

test("원장이 보험 양식을 등록하고 삭제할 수 있다", async ({ page }) => {
  await setupOutcomes(page);
  let forms: typeof form[] = [];
  await page.route("**/api/admin/insurance-forms", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
      expect(route.request().postData()).toContain(form.insurer);
      forms = [form];
      return route.fulfill({ status: 201, json: { data: { ok: true } } });
    }
    return route.fulfill({ json: { data: forms } });
  });
  await page.route(`**/api/admin/insurance-forms/${form.id}`, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    forms = [];
    return route.fulfill({ json: { data: { ok: true } } });
  });
  await page.goto("/admin/operations/insurance-forms");
  await expect(page.getByText("등록된 보험 양식이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: "양식 등록" }).click();
  await page.getByLabel("보험사명", { exact: true }).fill(form.insurer);
  await page.getByLabel("양식명", { exact: true }).fill(form.title);
  await page.getByLabel("PDF 파일").setInputFiles({
    name: "form.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7"),
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("양식을 등록했습니다.")).toBeVisible();
  await page.getByRole("button", { name: `${form.insurer} ${form.title} 삭제` }).click();
  await page.getByRole("button", { name: "삭제 확인" }).click();
  await expect(page.getByText("양식을 삭제했습니다.")).toBeVisible();
  await expect(page.getByText("등록된 보험 양식이 없습니다.")).toBeVisible();
});

test("직원이 모바일에서 양식을 검색해 새 탭으로 열 수 있다", async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setupOutcomes(page);
  await page.route("**/api/admin/auth-check", (route) => route.fulfill({ json: { ok: true, access: { isOwner: false } } }));
  await page.route("**/api/admin/insurance-forms", (route) => route.fulfill({ json: { data: [form] } }));
  await page.route(`**/api/admin/insurance-forms/${form.id}`, (route) => route.fulfill({
    json: { data: { url: "http://localhost:3000/insurance-form-preview-fixture" } },
  }));
  await context.route("**/insurance-form-preview-fixture", (route) => route.fulfill({ body: "PDF 미리보기 요청 확인" }));
  await page.goto("/staff/system/insurance-forms");
  await expect(page.getByRole("link", { name: "보험 양식" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "양식 등록" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /삭제/ })).toHaveCount(0);
  const search = page.getByRole("searchbox");
  await search.fill("다른 보험사");
  await expect(page.getByText("검색 조건에 맞는 양식이 없습니다.")).toBeVisible();
  await search.fill("예시 손해");
  const preview = context.waitForEvent("page");
  await page.getByRole("button", { name: /PDF 열기 및 인쇄/ }).click();
  await expect(await preview).toHaveURL(/insurance-form-preview-fixture$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test("로그인하지 않으면 양식 목록과 PDF 주소를 받을 수 없다", async ({ request }) => {
  for (const path of ["/api/admin/insurance-forms", `/api/admin/insurance-forms/${form.id}`]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});
