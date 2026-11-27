import { expect, test } from "@playwright/test";
import { setupOutcomes } from "./helpers/admin-outcomes";

const form = {
  id: "00000000-0000-4000-8000-000000000001",
  insurer: "예시손해보험",
  title: "치과치료확인서",
  createdAt: "2026-11-26T05:00:00.000Z",
  sourceUrl: "https://insurer.example/form.pdf",
  sourcePageUrl: "https://insurer.example/claims",
};

function samplePrintPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 5 0 R >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << >> /Contents 6 0 R >>",
    ...["0 0 0 rg 30 600 60 60 re f\n", "0 0 0 rg 60 400 60 60 re f\n"].map(stream =>
      `<< /Length ${stream.length} >>\nstream\n${stream}endstream`),
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return String(offset).padStart(10, "0");
  });
  return Buffer.from(pdf + `xref\n0 7\n0000000000 65535 f \n${offsets.map(offset => `${offset} 00000 n \n`).join("")}trailer\n<< /Root 1 0 R /Size 7 >>\nstartxref\n${pdf.length}\n%%EOF\n`);
}

test("원장이 보험 양식을 등록하고 삭제할 수 있다", async ({ page }) => {
  await setupOutcomes(page);
  let forms: typeof form[] = [];
  await page.route("**/api/admin/insurance-forms", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
      expect(route.request().postData()).toContain(form.insurer);
      expect(route.request().postData()).toContain(form.sourceUrl);
      expect(route.request().postData()).toContain(form.sourcePageUrl);
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
  const registration = page.getByRole("button", { name: "양식 등록" });
  const dialog = page.getByRole("dialog", { name: "양식 등록" });
  const preview = page.locator("#insurance-form-preview");
  const previewBefore = await preview.boundingBox();
  await registration.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("보험사명", { exact: true })).toBeFocused();
  expect(await preview.boundingBox()).toEqual(previewBefore);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(registration).toBeFocused();
  await registration.click();
  await page.getByLabel("보험사명", { exact: true }).fill(form.insurer);
  await page.getByLabel("양식명", { exact: true }).fill(form.title);
  await page.getByLabel("PDF 파일").setInputFiles({
    name: "form.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(page.getByLabel("원본 PDF 주소")).toBeHidden();
  const sourceFields = page.locator("summary").filter({ hasText: "출처 주소 추가 (선택)" });
  await sourceFields.click();
  await page.getByLabel("원본 PDF 주소").fill(form.sourceUrl);
  await page.getByLabel("보험사 안내 페이지 주소").fill(form.sourcePageUrl);
  await sourceFields.click();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("양식을 등록했습니다.")).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page.getByRole("link", { name: /원본 PDF/ })).toHaveCount(0);
  await page.getByLabel(`${form.insurer} ${form.title} 양식 정보`).click();
  await expect(page.getByRole("link", { name: /원본 PDF/ })).toHaveAttribute("href", form.sourceUrl);
  await page.getByRole("button", { name: `${form.insurer} ${form.title} 삭제` }).click();
  await page.getByRole("button", { name: `${form.insurer} ${form.title} 삭제 취소` }).click();
  await expect(page.getByRole("button", { name: "삭제 확인" })).toHaveCount(0);
  await page.getByRole("button", { name: `${form.insurer} ${form.title} 삭제` }).click();
  await page.getByRole("button", { name: "삭제 확인" }).click();
  await expect(page.getByText("양식을 삭제했습니다.")).toBeVisible();
  await expect(page.getByText("등록된 보험 양식이 없습니다.")).toBeVisible();
});

test("직원이 모바일 카드에서 양식을 선택하고 같은 화면에서 인쇄할 수 있다", async ({ page, context }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setupOutcomes(page);
  await page.route("**/api/admin/auth-check", (route) => route.fulfill({ json: { ok: true, access: { isOwner: false } } }));
  const otherForms = ["흥국화재", "AIA생명", "다른손해보험", "KB손해보험", "삼성화재", "AXA손해보험", "DB손해보험"].map((insurer, index) => ({
    ...form,
    id: `00000000-0000-4000-8000-00000000000${index + 2}`,
    insurer,
    title: "치과치료확인서 (충전·크라운 / 보철치료)",
    sourceUrl: null,
    sourcePageUrl: null,
  }));
  const linaForms = ["임플란트·브릿지·틀니용", "충전·크라운용"].map((treatment, index) => ({
    ...form,
    id: `00000000-0000-4000-8000-00000000001${index}`,
    insurer: "라이나생명",
    title: `치과진료확인서 (${treatment})`,
  }));
  await page.route("**/api/admin/insurance-forms", (route) => route.fulfill({ json: { data: [form, ...otherForms, ...linaForms] } }));
  await page.route(`**/api/admin/insurance-forms/${form.id}`, (route) => route.fulfill({
    json: { data: { url: new URL("/insurance-form-preview-fixture", route.request().url()).href } },
  }));
  await context.route("**/insurance-form-preview-fixture", (route) => route.fulfill({
    contentType: "application/pdf", body: samplePrintPdf(),
  }));
  await page.addInitScript((fixtureHash) => {
    window.print = () => { document.body.dataset.printCalled = "true"; };
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = (algorithm, data) => {
      if (data instanceof ArrayBuffer && new TextDecoder().decode(data.slice(0, 5)) === "%PDF-") {
        return Promise.resolve(Uint8Array.from(fixtureHash.match(/../g)!, value => Number.parseInt(value, 16)).buffer);
      }
      return digest(algorithm, data);
    };
  // Use Samsung's verified positions for the synthetic PDF in this test.
  }, "e0009a087bf6d92e60f7697103fd888e6d0898c7bbb8992621fd0dfe40bac74c");
  await page.goto("/staff/system/insurance-forms");
  await expect(page.getByRole("link", { name: "보험 양식" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "양식 등록" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /삭제/ })).toHaveCount(0);
  const orderedInsurers = ["다른손해보험", "라이나생명", "라이나생명", "삼성화재", "예시손해보험", "흥국화재", "AIA생명", "AXA손해보험", "DB손해보험", "KB손해보험"];
  const cards = page.getByRole("list", { name: "보험 양식 목록" }).locator("button[aria-pressed]");
  await expect(cards).toHaveCount(orderedInsurers.length);
  for (const [index, insurer] of orderedInsurers.entries()) {
    await expect(cards.nth(index)).toHaveAccessibleName(new RegExp(`^${insurer} `));
  }
  for (const linaForm of linaForms) {
    expect(await cards.getByText(linaForm.title, { exact: true }).innerText()).toBe(linaForm.title.replace(" (", "\n("));
  }
  await expect(page.getByText("DB손해보험", { exact: true })).toBeVisible();
  await expect(page.getByText("KB손해보험", { exact: true })).toBeVisible();
  const search = page.getByRole("searchbox");
  await search.fill("AXA");
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAccessibleName(/^AXA손해보험 /);
  await search.fill("다른 보험사");
  await expect(page.getByText("검색 조건에 맞는 양식이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: "검색 지우기" }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await search.fill("예시 손해");
  const info = page.getByLabel(`${form.insurer} ${form.title} 양식 정보`);
  const original = page.getByRole("link", { name: /원본 PDF/ });
  const guide = page.getByRole("link", { name: /보험사 안내/ });
  await expect(original).toHaveCount(0);
  await expect(guide).toHaveCount(0);
  await search.press("Tab");
  const card = cards.first();
  await expect(card).toBeFocused();
  await card.press("Tab");
  await expect(info).toBeFocused();
  await info.press("Enter");
  await expect(original).toHaveAttribute("href", form.sourceUrl);
  await expect(guide).toHaveAttribute("href", form.sourcePageUrl);
  await expect(page.getByRole("button", { name: /삭제/ })).toHaveCount(0);
  await info.press("Space");
  await expect(guide).toHaveCount(0);
  expect((await card.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect((await info.boundingBox())?.width).toBeGreaterThanOrEqual(44);
  const preview = page.getByRole("region", { name: "양식 미리보기" });
  const frame = preview.locator("#insurance-form-preview-page");
  const placeholder = preview.getByText("보험사 양식을 선택하면 미리볼 수 있습니다.");
  await expect(placeholder).toBeVisible();
  const reservedHeight = await placeholder.evaluate((message) => message.parentElement!.clientHeight);
  expect(reservedHeight).toBeGreaterThan(300);
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  const print = preview.getByRole("button", { name: "PDF 인쇄" });
  const previewImage = preview.getByRole("img");
  const previous = preview.getByRole("button", { name: "이전 쪽" });
  const next = preview.getByRole("button", { name: "다음 쪽" });
  await expect(previewImage).toHaveAttribute("alt", /1쪽 미리보기$/);
  expect(await frame.evaluate((element) => element.clientHeight)).toBe(reservedHeight);
  await expect(preview.getByRole("status")).toHaveText("1 / 2쪽");
  await expect(previous).toBeDisabled();
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const narrowPreview = (await previewImage.boundingBox())!;
  expect(narrowPreview.width / narrowPreview.height).toBeCloseTo(595 / 842);
  const narrowFrameHeight = await frame.evaluate((element) => element.clientHeight);
  const zoom = preview.locator("header").getByRole("group", { name: "미리보기 배율" });
  const zoomIn = zoom.getByRole("button", { name: "미리보기 확대" });
  const zoomOut = zoom.getByRole("button", { name: "미리보기 축소" });
  const plusBounds = (await zoomIn.boundingBox())!;
  const minusBounds = (await zoomOut.boundingBox())!;
  expect(minusBounds.x + minusBounds.width).toBeLessThanOrEqual(plusBounds.x);
  expect(plusBounds.y).toBe(minusBounds.y);
  expect(plusBounds.y + plusBounds.height).toBeLessThan(narrowPreview.y);
  expect(plusBounds.width).toBeGreaterThanOrEqual(44);
  expect(plusBounds.height).toBeGreaterThanOrEqual(44);
  await expect(zoomOut).toBeDisabled();
  await zoomIn.click();
  const zoomedPreview = preview.getByRole("region", { name: "확대된 양식 미리보기" });
  await expect(zoomedPreview).toBeVisible();
  expect(await zoomedPreview.evaluate((frame) => frame.scrollWidth > frame.clientWidth)).toBe(true);
  expect(await zoomedPreview.evaluate((frame) => frame.clientHeight)).toBe(narrowFrameHeight);
  const zoomedWidth = (await previewImage.boundingBox())!.width;
  expect(zoomedWidth).toBeGreaterThan(narrowPreview.width);
  await zoomIn.click();
  expect((await previewImage.boundingBox())!.width).toBeGreaterThan(zoomedWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await zoomOut.click();
  await zoomOut.click();
  await expect(zoomOut).toBeDisabled();
  await expect(zoomedPreview).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 560 });
  const heading = page.getByRole("heading", { name: "치과보험 진료확인서", exact: true });
  expect((await preview.boundingBox())!.y).toBeCloseTo((await heading.boundingBox())!.y, 0);
  const shortPreview = (await previewImage.boundingBox())!;
  expect(shortPreview.height).toBeGreaterThan(560 * 0.64);
  expect(shortPreview.height).toBeLessThanOrEqual(560 * 0.64 + 48);
  const shortFrameHeight = await frame.evaluate((element) => element.clientHeight);
  expect(await frame.evaluate((container) => {
    return container.scrollHeight === container.clientHeight && container.scrollWidth === container.clientWidth;
  })).toBe(true);
  await expect(frame.getByText("서울본치과의원", { exact: true })).toBeVisible();
  await expect(frame.getByText("647-18-00478", { exact: true })).toBeVisible();
  const includeInfo = preview.getByRole("checkbox", { name: "병원 정보 인쇄" });
  await expect(includeInfo).toBeChecked();
  await includeInfo.uncheck();
  await expect(frame.locator("svg text")).toHaveCount(0);
  await expect(page.locator("#insurance-form-print svg text")).toHaveCount(0);
  await includeInfo.check();
  await preview.getByText("이번 출력 정보 수정", { exact: true }).click();
  await preview.getByRole("textbox", { name: "의사명" }).fill("변경의사");
  await expect(frame.getByText("변경의사", { exact: true })).toBeVisible();
  await next.click();
  await expect(previewImage).toHaveAttribute("alt", /2쪽 미리보기$/);
  await expect(preview.getByRole("status")).toHaveText("2 / 2쪽");
  await expect(next).toBeDisabled();
  const landscapePreview = (await previewImage.boundingBox())!;
  expect(landscapePreview.width / landscapePreview.height).toBeCloseTo(842 / 595);
  expect(await frame.evaluate((element) => element.clientHeight)).toBe(shortFrameHeight);
  await previous.click();
  await expect(previewImage).toHaveAttribute("alt", /1쪽 미리보기$/);
  await next.click();
  await expect(previewImage).toHaveAttribute("alt", /2쪽 미리보기$/);
  await print.click();
  await expect(page.locator("body")).toHaveAttribute("data-print-called", "true");
  await expect(search).toHaveValue("예시 손해");
  await expect(page).toHaveURL(/\/staff\/system\/insurance-forms$/);
  expect(context.pages()).toEqual([page]);
  await page.emulateMedia({ media: "print" });
  const printPages = page.locator("#insurance-form-print img");
  await expect(printPages).toHaveCount(2);
  await expect(printPages.first()).toBeVisible();
  await expect(page.locator("#insurance-form-print svg").getByText("변경의사", { exact: true })).toBeVisible();
  await expect(search).toBeHidden();
  const printedPdf = await page.pdf({ preferCSSPageSize: true });
  expect(printedPdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(2);
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(preview.getByRole("textbox", { name: "의사명" })).toHaveValue("김창균");
});

test("로그인하지 않으면 양식 목록과 PDF 주소를 받을 수 없다", async ({ request }) => {
  for (const path of ["/api/admin/insurance-forms", `/api/admin/insurance-forms/${form.id}`]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});
