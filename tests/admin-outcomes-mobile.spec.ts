import { expect, test } from "@playwright/test";
import { conversion, path, post, search, setupOutcomes } from "./helpers/admin-outcomes";

for (const width of [360, 390]) {
  test(`${width}px 검색 성과는 화면 안에서 정보·정렬·전체 제목과 수치를 제공한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setupOutcomes(page);
    const query = "김포 임플란트 수술 후 통증과 식사 주의사항은 언제까지 지켜야 하나요";
    await page.route("**/api/admin/search-console?**", route => route.fulfill({ json: { data: {
      ...search,
      topQueries: [{ query, impressions: 12345, clicks: 345, ctr: 2.8, position: 4.5 }],
      queryTopPages: { [query]: [{ page: "https://www.born2smile.co.kr/", impressions: 12345, clicks: 345, ctr: 2.8, position: 4.5 }] },
    } } }));
    await page.goto("/admin/analysis/search");
    await page.getByText("데이터 정보", { exact: true }).click();
    const info = await page.getByText("속성: sc-domain:born2smile.co.kr", { exact: true }).locator("..").boundingBox();
    expect(info!.x).toBeGreaterThanOrEqual(0);
    expect(info!.x + info!.width).toBeLessThanOrEqual(width);
    const keywords = page.getByRole("region", { name: "상위 검색 키워드", exact: true });
    await keywords.getByRole("button", { name: "상세 보기", exact: true }).click();
    const button = keywords.getByRole("button", { name: query, exact: true });
    await expect(button).toBeVisible();
    expect(await button.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(keywords.getByText("12,345", { exact: true }).filter({ visible: true })).toBeVisible();
    await keywords.getByRole("combobox", { name: "정렬 기준" }).selectOption("clicks");
    await expect(keywords.getByRole("button", { name: "내림차순 ↓" })).toBeVisible();
    await button.click();
    await expect(page.getByRole("heading", { name: new RegExp(query) })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("search-mobile.png"), fullPage: true });
  });

  test(`${width}px 문의 성과는 한국어 제목과 위치별 핵심 수치를 카드로 표시한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setupOutcomes(page);
    await page.route("**/api/admin/posthog/conversion?**", route => route.fulfill({ json: { data: {
      ...conversion,
      byLocation: [
        { ctaLocation: "mobile_sticky_cta", clicks: 120, percentage: 45 },
        { ctaLocation: "header_desktop", clicks: 12, percentage: 5 },
      ],
      topBlogPosts: [{ slug: post.slug, totalClicks: 1234, phoneClicks: 234, contactClicks: 1000 }],
      topSharedBlogPosts: [{ slug: post.slug, shareActions: 25, shareVisits: 60, visitRate: 240, copiedShares: 15, nativeShares: 10 }],
    } } }));
    await page.goto("/admin/operations/conversion");
    await expect(page.getByText("모바일 고정 CTA", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("mobile_sticky_cta", { exact: true })).toHaveCount(0);
    const cards = page.getByRole("list", { name: "성과 요약" });
    await expect(cards.filter({ hasText: "1234" }).getByText(post.title, { exact: true })).toBeVisible();
    await expect(cards.filter({ hasText: "2.4회" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("conversion-mobile.png"), fullPage: true });
    if (width === 360) {
      await page.goto("/admin/operations/conversion?location=mobile");
      const filter = page.getByRole("checkbox", { name: "모바일 전용 버튼만 보기" });
      await expect(filter).toBeChecked();
      await expect(page.getByText("PC 상단 문의", { exact: true })).toHaveCount(0);
      await filter.uncheck();
      await expect(page.getByText("PC 상단 문의", { exact: true }).filter({ visible: true })).toBeVisible();
    }
  });
}

test("모바일 읽기 카드는 표본·반응·문의와 페이지 이동을 유지한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await setupOutcomes(page);
  const counts = { visits: 3, eligibleVisits: 3, qualified: 2, depth75: 2, time30: 2, feedbackPrompts: 3, solved: 1, unresolved: 1, shares: 1, inquiries: 1 };
  await page.route("**/api/admin/posthog/reading?**", route => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    return route.fulfill({ json: { data: {
      configured: true, period: "30d", cursor, nextCursor: cursor ? null : post.slug, pageSize: 25, totalPosts: 26,
      meta: { periodStart: "2026-10-15T15:00:00Z", periodEndExclusive: "2026-11-14T15:00:00Z", fetchedAt: "2026-11-15T00:00:00Z", firstObservedAt: "2026-11-01T00:00:00Z", measurementVersion: "reading-v2", partial: false },
      warnings: [], summary: counts, rows: cursor ? [] : [{ ...counts, slug: post.slug, path }], quality: { invalidEvents: 0, orphanViews: 1, duplicateStarts: 1 },
    } } });
  });
  await page.goto("/admin/analysis/traffic");
  await page.getByRole("tab", { name: "블로그", exact: true }).click();
  const cards = page.getByRole("list", { name: "성과 요약" });
  await expect(cards.getByRole("link", { name: new RegExp(post.title) })).toBeVisible();
  await expect(cards.getByText("표본 부족", { exact: true })).toBeVisible();
  await expect(cards.getByText("문의 연관", { exact: true })).toBeVisible();
  expect(await cards.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "다음 글 목록", exact: true }).click();
  await expect(page.getByRole("button", { name: "다음 글 목록", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "이전 글 목록", exact: true }).click();
  await expect(cards.getByText("표본 부족", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reading-mobile.png"), fullPage: true });
});

test("묶인 키워드는 모바일 카드에서 개별 검색어의 상세로 연결한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupOutcomes(page);
  const keywords = [
    { query: "김포 임플란트 비용", impressions: 100, clicks: 5, ctr: 5, position: 4, similarity: 1 },
    { query: "김포 임플란트 보험 적용 비용", impressions: 50, clicks: 2, ctr: 4, position: 6, similarity: 0.8 },
  ];
  await page.route("**/api/admin/search-console?**", route => route.fulfill({ json: { data: {
    ...search, topQueries: keywords,
    semanticClusters: [{ representative: keywords[0].query, keywords, impressions: 150, clicks: 7, ctr: 4.67, position: 5 }],
  } } }));
  await page.goto("/admin/analysis/search");
  const region = page.getByRole("region", { name: "상위 검색 키워드", exact: true });
  await region.getByRole("button", { name: "상세 보기", exact: true }).click();
  await region.locator("summary").filter({ hasText: "묶인 키워드 2개" }).click();
  await region.getByRole("button", { name: keywords[1].query, exact: true }).click();
  await expect(page.getByRole("heading", { name: keywords[1].query, exact: true })).toBeVisible();
});
