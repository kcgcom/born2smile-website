import { expect, test } from "@playwright/test";
import { conversion, path, post, setupOutcomes } from "./helpers/admin-outcomes";

for (const width of [1280, 1440]) {
  test(`${width}px 검색 팝업·조회 도구·정렬 조작이 읽기 쉬운 크기를 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setupOutcomes(page);
    await page.goto("/admin/analysis/search");
    await expect(page.getByText("집계 기간:", { exact: false })).toBeVisible();
    const toolbar = page.getByRole("region", { name: "리포트 조회 도구", exact: true });
    expect((await toolbar.boundingBox())!.height).toBeLessThan(120);
    await toolbar.getByText("데이터 정보", { exact: true }).click();
    const info = await page.getByText("속성: sc-domain:born2smile.co.kr", { exact: true }).locator("..").boundingBox();
    expect(info!.width).toBeGreaterThanOrEqual(300);
    expect(info!.x).toBeGreaterThanOrEqual(0);
    expect(info!.x + info!.width).toBeLessThanOrEqual(width);
    const region = page.getByRole("region", { name: "일반 페이지별 검색 성과", exact: true });
    await region.getByRole("button", { name: "상세 보기", exact: true }).click();
    const sort = region.getByRole("button", { name: "클릭", exact: false });
    expect((await sort.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sort.click();
    await expect(region.getByRole("columnheader", { name: "클릭", exact: false })).toHaveAttribute("aria-sort", "descending");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("search-desktop.png"), fullPage: true });
  });

  test(`${width}px 문의·공유 상세 표는 두 열로 비교하고 수치를 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setupOutcomes(page);
    await page.route("**/api/admin/posthog/conversion?**", route => route.fulfill({ json: { data: {
      ...conversion,
      byLocation: [{ ctaLocation: "header_desktop", clicks: 120, percentage: 45 }],
      topPages: [{ pagePath: path, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      topBlogPosts: [{ slug: post.slug, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      shareSources: [{ shareSource: "mobile_sticky_cta", shareActions: 25, shareVisits: 60, visitRate: 240 }],
      topSharedBlogPosts: [{ slug: post.slug, shareActions: 25, shareVisits: 60, visitRate: 240, copiedShares: 15, nativeShares: 10 }],
    } } }));
    await page.goto("/admin/operations/conversion");
    const left = await page.getByRole("heading", { name: "공유 버튼 위치별 성과", exact: true }).boundingBox();
    const right = await page.getByRole("heading", { name: "CTA 위치별 성과", exact: true }).boundingBox();
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(5);
    expect(right!.x).toBeGreaterThan(left!.x + 200);
    const tables = page.getByRole("table");
    await expect(tables.filter({ hasText: "PC 상단 문의" })).toBeVisible();
    await expect(tables.filter({ hasText: "공유 위치" })).toContainText("2.4회");
    await expect(tables.filter({ hasText: "총 클릭" })).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath("conversion-desktop.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("방문 차트는 한국어 페이지명과 원본 상세 연결을 유지하고 빈 블로그 영역을 축약한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupOutcomes(page);
  await page.goto("/admin/analysis/traffic");
  const chart = page.getByRole("img", { name: "주요 페이지·섹션 차트 · 아래 표에서 수치와 상세를 확인할 수 있습니다.", exact: true });
  await expect(chart.getByText(post.title, { exact: true })).toBeVisible();
  await page.getByText("수치 및 상세 표 보기", { exact: true }).first().click();
  const opener = page.getByRole("button", { name: path + " 상세 보기", exact: true });
  await expect(opener).toHaveText(post.title);
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.getByRole("tab", { name: "블로그", exact: true }).click();
  for (const title of ["글별 방문 성과", "유입 구조"]) {
    const card = page.getByRole("heading", { name: title, exact: true }).locator("..");
    await expect(card).toContainText("선택 기간의 데이터가 없습니다.");
    expect((await card.boundingBox())!.height).toBeLessThan(130);
  }
  await page.screenshot({ path: testInfo.outputPath("reading-desktop.png"), fullPage: true });
});

test("데스크톱 색인 표는 한국어 설명과 Google 원문을 함께 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await setupOutcomes(page);
  await page.goto("/admin/analysis/indexing");
  const table = page.getByRole("table");
  await expect(table.getByText("Google이 URL을 발견했지만 아직 검색 색인에 등록하지 않았습니다.", { exact: true })).toBeVisible();
  await table.getByText("Google 원문 사유", { exact: true }).click();
  await expect(table.getByText("Discovered - currently not indexed", { exact: true })).toBeVisible();
});
