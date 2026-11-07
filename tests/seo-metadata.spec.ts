import { expect, test } from "@playwright/test";
import { BASE_URL, CLINIC, HOURS, LINKS, enrichClinicWithContact } from "../lib/constants";
import { getClinicJsonLd, getBlogPostJsonLd } from "../lib/jsonld";
import { getBlogArticleImage } from "../lib/blog/seo-image";
import type { BlogPost } from "../lib/blog/types";
import { BLOG_POSTS_SNAPSHOT } from "../lib/blog/generated/posts-snapshot";
import { getTodayKST } from "../lib/date";

test("운영 병원 정보와 진료시간·링크를 구조화 데이터에 반영한다", () => {
  const clinic = enrichClinicWithContact({
    ...CLINIC, name: "테스트 치과", phone: "031-123-4567", addressShort: "테스트 주소",
  });
  const schema = getClinicJsonLd({
    clinic,
    hours: {
      ...HOURS,
      exceptions: [],
      schedule: [
        { day: "월요일", open: true, time: "10:00 - 17:00" },
        { day: "화요일", open: false, time: "휴진" },
      ],
    },
    links: { ...LINKS, instagram: "https://www.instagram.com/test", naverBlog: "" },
  });
  expect(schema.name).toBe(clinic.name);
  expect(schema.telephone).toBe(clinic.phoneIntl);
  expect(schema.address.streetAddress).toBe(clinic.addressShort);
  expect(schema.openingHoursSpecification).toEqual([
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "10:00", closes: "13:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "14:00", closes: "17:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Tuesday", opens: "00:00", closes: "00:00" },
  ]);
  expect(schema.sameAs).toContain("https://www.instagram.com/test");
  expect(schema.sameAs).not.toContain("");
});

const post: BlogPost = {
  slug: "seo-fixture", category: "implant", tags: [], title: "테스트", subtitle: "설명",
  excerpt: "테스트 설명", date: "2026-01-01", blocks: [],
};

test("숨김·장식·인라인 이미지를 제외하고 실제 본문 이미지를 선택한다", () => {
  const withImages: BlogPost = {
    ...post,
    blocks: [
      { type: "image", src: "/hidden.jpg", alt: "숨김", hidden: true },
      { type: "image", src: "/decoration.jpg", alt: "장식", decorative: true },
      { type: "image", src: "data:image/png;base64,AA==", alt: "인라인" },
      { type: "image", src: "/images/article.jpg", alt: "본문 설명", width: 1200, height: 800 },
    ],
  };
  expect(getBlogArticleImage(withImages)).toEqual({
    url: `${BASE_URL}/images/article.jpg`, alt: "본문 설명", width: 1200, height: 800,
  });
  expect(getBlogPostJsonLd(withImages).image).toEqual({
    "@type": "ImageObject", url: `${BASE_URL}/images/article.jpg`, width: 1200, height: 800,
  });
  expect(getBlogPostJsonLd(post)).not.toHaveProperty("image");
});

test("대표 도메인 이동은 경로와 쿼리를 유지하는 308이다", async ({ request }) => {
  const response = await request.get("/contact?from=seo", {
    headers: { host: "born2smile.co.kr" }, maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(`${BASE_URL}/contact?from=seo`);
  const canonical = await request.get("/contact", {
    headers: { host: "www.born2smile.co.kr" }, maxRedirects: 0,
  });
  expect(canonical.status()).toBe(200);
});

test("정적 페이지의 미추적 수정일은 생략하고 연구자료 노출 범위는 유지한다", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const contact = entries.find((entry) => entry.includes(`<loc>${BASE_URL}/contact</loc>`));
  expect(contact).toBeDefined();
  expect(contact).not.toContain("<lastmod>");
  expect(xml).not.toContain(`${BASE_URL}/research`);
  expect(entries.some((entry) => /\/blog\/[^/]+\/[^<]+<\/loc>/.test(entry) && entry.includes("<lastmod>"))).toBeTruthy();
});

test("상담 페이지의 화면·메타 설명·병원 JSON-LD가 같은 연락처를 쓴다", async ({ page }) => {
  await page.goto("/contact");
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(
    (elements) => elements.map((element) => JSON.parse(element.textContent ?? "{}")),
  );
  const clinic = schemas.find((schema) => schema["@id"] === `${BASE_URL}/#organization`);
  const contact = schemas.find((schema) => schema["@type"] === "ContactPage");
  expect(clinic.telephone).toBe(contact.mainEntity.telephone);
  expect(clinic.address.streetAddress).toBe(contact.mainEntity.address.streetAddress);
  const phoneLabel = await page.locator('a[aria-label^="대표전화"]').getAttribute("aria-label");
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description).toContain(phoneLabel);
});

test("공개 글의 본문 이미지가 OG·Twitter·BlogPosting에 동일하게 반영된다", async ({ page }) => {
  const sample = BLOG_POSTS_SNAPSHOT.find((candidate) => candidate.published
    && candidate.date <= getTodayKST() && getBlogArticleImage(candidate as BlogPost));
  test.skip(!sample, "공개 본문 이미지가 있는 글이 필요합니다.");
  const expected = getBlogArticleImage(sample as BlogPost)!;
  await page.goto(`/blog/${sample!.category}/${sample!.slug}`);
  await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", expected.url);
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", expected.url);
  const article = await page.locator('script[type="application/ld+json"]').evaluateAll(
    (elements) => elements.map((element) => JSON.parse(element.textContent ?? "{}"))
      .find((schema) => schema["@type"] === "BlogPosting"),
  );
  expect(article.image.url).toBe(expected.url);
});
