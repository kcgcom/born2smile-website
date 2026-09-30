import { expect, test } from "@playwright/test";
import { computeHeadingIds, getHeadingList } from "../components/blog/BlogPostRenderer";
import type { BlogBlock } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";

test("FAQ 묶음과 기존 제목은 목차에서 한 번씩만 연결된다", () => {
  const faq: BlogBlock = { type: "faq", question: "질문", answer: "답변" };
  const blocks: BlogBlock[] = [
    { type: "heading", level: 2, text: "본문" }, faq, faq,
    { type: "paragraph", text: "중간 설명" },
    { type: "heading", level: 2, text: "자주 묻는 질문 (FAQ)" }, faq,
    { type: "heading", level: 2, text: "마무리" },
  ];
  expect(getHeadingList({ blocks })).toEqual(["본문", "자주 묻는 질문", "자주 묻는 질문 (FAQ)", "마무리"]);
  expect(computeHeadingIds(blocks)).toEqual(["section-0", "section-1", undefined, undefined, "section-2", undefined, "section-3"]);
  expect(getHeadingList({ blocks: [] })).toEqual([]);
});

for (const width of [375, 1440]) {
  for (const slug of ["implant-screw-hole-resin-fell-out", "cold-sensitivity-after-cavity-treatment"]) {
    test(`${width}px FAQ 제목·답변·목차 연결: ${slug}`, async ({ page }) => {
      const post = BLOG_POSTS_SNAPSHOT.find((post) => post.slug === slug)!;
      const faqs = (post.blocks as BlogBlock[]).filter((block) => block.type === "faq");
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/blog/${post.category}/${slug}`);
      const group = page.getByRole("region", { name: "자주 묻는 질문", exact: true });
      await expect(group).toHaveCount(1);
      await expect(group.getByRole("heading", { level: 2 })).toHaveCount(1);
      await expect(group.getByRole("heading", { level: 3 })).toHaveCount(faqs.length);
      for (const faq of faqs) {
        await expect(group.getByText(faq.question, { exact: true })).toBeVisible();
        await expect(group.getByText(faq.answer, { exact: true })).toBeVisible();
      }
      const toc = page.getByRole("navigation", { name: "목차" });
      const toggle = toc.getByRole("button", { name: "목차" });
      if (width < 768) await toggle.click();
      const link = toc.getByRole("link", { name: "자주 묻는 질문", exact: true });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", `#${await group.getAttribute("id")}`);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`#${await group.getAttribute("id")}$`));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await group.screenshot({ path: `test-results/faq-${width}-${slug}.png` });
    });
  }
}
