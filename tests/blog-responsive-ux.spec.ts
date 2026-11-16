import { expect, test } from "@playwright/test";

const ARTICLE = "/blog/prosthetics/swallowed-dental-prosthesis-what-to-do";

for (const width of [360, 390, 1280, 1440]) {
  test(`${width}px 건강칼럼 탐색과 읽기 배치`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/blog");
    const card = page.locator("main article").first();
    await expect(card).toBeVisible();
    expect(await card.evaluate(node => node.getBoundingClientRect().top + scrollY)).toBeLessThan(500);
    await page.goto("/blog/implant");
    const nav = page.getByRole("navigation", { name: "건강칼럼 주제" });
    const current = nav.getByRole("link", { name: "임플란트", exact: true });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect.poll(async () => current.evaluate(node => {
      const r = node.getBoundingClientRect(); const parent = node.parentElement!.getBoundingClientRect();
      return r.left >= parent.left && r.right <= parent.right + 1;
    })).toBe(true);
    expect((await current.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole("navigation", { name: "이 주제에서 찾아보기" }).getByRole("link", { name: /^전체 글/ }).click();
    await expect(page).toHaveURL(/#hub-posts$/);
    await expect(page.getByRole("heading", { name: "전체 글 목록", exact: true })).toBeInViewport();
    await page.goto(ARTICLE);
    const toc = page.getByRole("navigation", { name: "목차" });
    const root = page.locator("[data-blog-reading-root]");
    await expect(root).toBeVisible();
    if (width < 768) {
      const toggle = toc.getByRole("button", { name: "목차", exact: true });
      expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await toggle.click();
      expect((await toc.getByRole("link").first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await toc.getByRole("link").nth(1).click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#section-1")).toBeFocused();
    } else {
      const tocBox = (await toc.boundingBox())!;
      const rootBox = (await root.boundingBox())!;
      expect(tocBox.x + tocBox.width).toBeLessThanOrEqual(rootBox.x);
      expect(rootBox.y).toBeLessThan(700);
      await toc.getByRole("link").nth(1).click();
      await expect.poll(async () => (await toc.boundingBox())!.y).toBeGreaterThanOrEqual(90);
    }
    for (const name of ["칼럼 목록", "칼럼 목록으로"]) {
      expect((await page.getByRole("link", { name, exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
