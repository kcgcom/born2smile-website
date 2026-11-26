import { expect, test } from "@playwright/test";

const BOOKING_URL = "https://m.booking.naver.com/booking/16/bizes/1768707?theme=place&lang=ko&area=ple";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 320, height: 800 },
]) {
  for (const path of ["/", "/contact"]) {
    const bookingLabel = path === "/" ? "진료예약" : "네이버 예약";
    test(`${viewport.width}px ${path} 본문의 ${bookingLabel} 버튼이 예약 페이지로 이동한다`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route("https://m.booking.naver.com/**", (route) =>
        route.fulfill({ body: "네이버 예약 테스트" }),
      );
      await page.goto(path);
      const main = page.getByRole("main");
      const booking = main.getByRole("link", { name: bookingLabel, exact: true });
      await expect(booking).toHaveCSS("color", "rgb(37, 99, 235)");
      await expect(booking).toHaveCSS("border-top-color", "rgb(37, 99, 235)");
      await expect(booking.locator("svg")).toHaveCSS("fill", "rgb(3, 199, 90)");
      if (path === "/") {
        const phone = main.getByRole("link", { name: "전화문의", exact: true });
        await expect(phone).toHaveAttribute("href", "tel:18337552");
        await expect(phone.locator("svg")).toBeVisible();
        const [bookingBox, phoneBox] = await Promise.all([booking.boundingBox(), phone.boundingBox()]);
        expect(bookingBox!.y).toBeCloseTo(phoneBox!.y);
        expect(bookingBox!.x + bookingBox!.width).toBeLessThanOrEqual(phoneBox!.x);
      } else {
        const phone = main.getByRole("link", { name: /^대표전화/ });
        const [bookingBox, phoneBox] = await Promise.all([booking.boundingBox(), phone.boundingBox()]);
        expect(bookingBox!.y + bookingBox!.height).toBeLessThanOrEqual(phoneBox!.y);
      }
      await booking.click();
      await expect(page).toHaveURL(BOOKING_URL);
    });
  }
}

test("320px 모바일 하단의 문의 / 예약에서 전화와 네이버 예약에 접근한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route("https://m.booking.naver.com/**", (route) =>
    route.fulfill({ body: "네이버 예약 테스트" }),
  );
  await page.goto("/");

  const menu = page.getByRole("navigation", { name: "빠른 메뉴" });
  const links = menu.getByRole("link");
  await expect(links).toHaveCount(5);
  const firstBox = await links.first().boundingBox();
  for (const link of await links.all()) {
    await expect(link).toBeInViewport({ ratio: 1 });
    const box = await link.boundingBox();
    expect(box!.y).toBe(firstBox!.y);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const contact = menu.getByRole("link", { name: "문의 / 예약" });
  await expect(contact).toHaveCSS("color", "rgb(122, 90, 18)");
  const contactLabelLineCount = await contact.evaluate(async (link) => {
    await document.fonts.ready;
    const label = Array.from(link.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (!label) return 0;
    const range = document.createRange();
    range.selectNodeContents(label);
    return new Set(Array.from(range.getClientRects(), (rect) => rect.top)).size;
  });
  expect(contactLabelLineCount).toBe(1);
  await contact.click();
  await expect(page).toHaveURL("/contact");
  await expect(contact).toHaveAttribute("aria-current", "page");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /^대표전화/ })).toHaveAttribute("href", "tel:18337552");
  await main.getByRole("link", { name: "네이버 예약" }).click();
  await expect(page).toHaveURL(BOOKING_URL);
});
