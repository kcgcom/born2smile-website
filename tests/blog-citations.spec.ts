import { expect, test } from "@playwright/test";
import { blogPostUpdateSchema } from "../lib/blog-validation";
import { normalizeBlogBlocks } from "../lib/blog/normalize-blocks";
import { getBlogCitations } from "../lib/blog/citations";
import citations from "../scripts/data/swallowed-prosthesis-citations.json";

const PATH = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";

test("관리자 저장 정규화는 주석을 보존하고 잘못된 연결을 거부한다", () => {
  const blocks = citations.map((citation, index) => index === 2
    ? { type: "faq", question: "병원에서는 어떤 검사를 하나요?", answer: citation.quote, citations: [citation] }
    : { type: "paragraph", text: citation.quote, citations: [citation] });
  const normalized = normalizeBlogBlocks(blocks);
  expect(blogPostUpdateSchema.parse({ blocks: normalized }).blocks).toEqual(blocks);
  expect(getBlogCitations(normalized).map((citation) => citation.id)).toEqual(citations.map((citation) => citation.id));
  const changed = [{ ...blocks[0], text: "수정된 본문에서는 원래 인용 문장이 사라졌습니다." }];
  expect(blogPostUpdateSchema.safeParse({ blocks: normalizeBlogBlocks(changed) }).success).toBe(false);
  for (const patch of [
    { sourceHref: "javascript:alert(1)" },
    { researchHref: "//example.com/research/test#paper-test" },
    { researchHref: "/research/../admin#paper-test" },
  ]) {
    const bad = [{ ...blocks[0], citations: [{ ...citations[0], ...patch }] }];
    expect(blogPostUpdateSchema.safeParse({ blocks: normalizeBlogBlocks(bad) }).success).toBe(false);
  }
  const duplicated = [...normalized, normalized[0]];
  expect(blogPostUpdateSchema.safeParse({ blocks: duplicated }).success).toBe(true);
  expect(getBlogCitations(duplicated)).toHaveLength(3);
  expect(blogPostUpdateSchema.safeParse({ blocks: normalizeBlogBlocks([{ ...blocks[0], citations: "bad" }]) }).success).toBe(false);
});

test("키보드로 근거를 열고 닫으며 초점을 복원한다", async ({ page }) => {
  await page.goto(PATH);
  const triggers = page.getByRole("button", { name: /^근거 \d:/ });
  await expect(triggers).toHaveCount(3);
  const first = triggers.first();
  await expect(first).toHaveAccessibleName(`근거 1: ${citations[0].title}`);
  await first.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "근거 설명 닫기" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("link", { name: "연구 해설 보기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await first.click();
  await page.getByRole("dialog").getByRole("button", { name: "근거 설명 닫기" }).click();
  await expect(first).toBeFocused();
  await first.click();
  await page.mouse.click(8, 8);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("위첨자는 줄 높이를 늘리지 않으며 화면 밖으로 나가면 설명창이 닫힌다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PATH);
  const first = page.getByRole("button", { name: /^근거 1:/ });
  await first.evaluate((button) => button.closest("p")!.scrollIntoView({ block: "center", behavior: "instant" }));
  const metrics = await first.evaluate((button) => {
    const paragraph = button.closest("p")!;
    const height = paragraph.getBoundingClientRect().height;
    const box = button.getBoundingClientRect();
    const marker = button.querySelector("span")!.getBoundingClientRect();
    const parent = button.closest("sup")!.parentElement!;
    const range = document.createRange();
    range.selectNodeContents(parent.firstChild!);
    const word = range.getBoundingClientRect();
    button.style.display = "none";
    const withoutButton = paragraph.getBoundingClientRect().height;
    button.style.removeProperty("display");
    return { height, withoutButton, width: box.width, touchHeight: box.height,
      markerWidth: marker.width, markerTop: marker.top, wordTop: word.top,
      wordBottom: word.bottom, markerLeft: marker.left, wordRight: word.right };
  });
  expect(metrics.height).toBe(metrics.withoutButton);
  expect(metrics.width).toBeGreaterThanOrEqual(44);
  expect(metrics.touchHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.markerWidth).toBeLessThanOrEqual(24);
  expect(metrics.markerTop).toBeLessThan(metrics.wordTop);
  expect(metrics.markerLeft - metrics.wordRight).toBeLessThanOrEqual(4);
  await first.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate(() => window.scrollBy({ top: 12, behavior: "instant" }));
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/citation-mobile-refined.png" });
  await first.evaluate((button) => window.scrollBy({ top: button.getBoundingClientRect().bottom + 50, behavior: "instant" }));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(first).toHaveAttribute("aria-expanded", "false");
  expect(await first.evaluate((button) => button.getBoundingClientRect().bottom)).toBeLessThan(0);
});

test("모바일 팝오버는 화면 안에 표시되고 정확한 논문으로 이동한다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PATH);
  const trigger = page.getByRole("button", { name: /^근거 3:/ });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(740);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => {
    const resized = await dialog.boundingBox();
    return !!resized && resized.x >= 0 && resized.x + resized.width <= 320
      && resized.y >= 0 && resized.y + resized.height <= 568;
  }).toBe(true);
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(dialog.getByRole("link", { name: "원문 보기 (새 창)" })).toHaveAttribute("href", citations[2].sourceHref);
  await page.screenshot({ path: "test-results/citation-mobile.png", fullPage: false });
  await dialog.getByRole("link", { name: "연구 해설 보기" }).click();
  await expect(page).toHaveURL(new RegExp(`${citations[2].researchHref}$`));
  const paper = page.locator("#paper-lee-2025-foreign-body-imaging");
  await expect(paper).toBeVisible();
  await expect(paper).toBeInViewport();
});

test("참고 근거는 초기 HTML에 링크를 제공하며 FAQ 데이터는 본문을 유지한다", async ({ page, request }) => {
  await page.goto(PATH);
  const refs = page.getByRole("region", { name: "참고 근거" });
  await expect(refs.getByRole("listitem")).toHaveCount(3);
  await expect(refs.locator(`a[href="${citations[2].researchHref}"]`)).toHaveCount(1);
  await expect(refs.getByRole("link", { name: /^원문/ })).toHaveCount(3);
  await expect(refs.getByRole("link", { name: "연구 해설", exact: true })).toHaveCount(3);
  // The old research card is replaced in the new UI, but unrelated links remain.
  await expect(page.locator('a[href="/research/swallowed-dental-prosthesis"]')).toHaveCount(0);
  await expect(page.locator('a[href="/blog/prosthetics/crown-fell-off-what-to-do"]')).not.toHaveCount(0);
  const html = await (await request.get(PATH)).text();
  // Next streams this dynamic page through Suspense. Assert crawlable server HTML,
  // rather than claiming the existing app supports navigation with JS disabled.
  for (const citation of citations) {
    expect(html).toContain(`href="${citation.researchHref}"`);
    expect(html).toContain(`href="${citation.sourceHref}"`);
  }
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const faq = schemas.find((schema) => schema["@type"] === "FAQPage");
  expect(faq.mainEntity[1].acceptedAnswer.text).toContain(citations[2].quote);
  expect(faq.mainEntity[1].acceptedAnswer.text).not.toContain("[3]");
});
