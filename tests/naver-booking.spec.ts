import { expect, test } from "@playwright/test";

const BOOKING_URL = "https://m.booking.naver.com/booking/16/bizes/1768707?theme=place&lang=ko&area=ple";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  for (const path of ["/", "/contact"]) {
    test(`${viewport.width}px ${path} 본문의 네이버 예약 버튼이 예약 페이지로 이동한다`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.route("https://m.booking.naver.com/**", (route) =>
        route.fulfill({ body: "네이버 예약 테스트" }),
      );
      await page.goto(path);
      await page.getByRole("main").getByRole("link", { name: "네이버 예약" }).click();
      await expect(page).toHaveURL(BOOKING_URL);
    });
  }
}

test("모바일 하단에서 전화 상담 옆에 네이버 예약을 표시한다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("https://m.booking.naver.com/**", (route) =>
    route.fulfill({ body: "네이버 예약 테스트" }),
  );
  await page.goto("/");

  const menu = page.getByRole("navigation", { name: "빠른 메뉴" });
  const phone = menu.getByRole("link", { name: "전화 상담" });
  const booking = menu.getByRole("link", { name: "네이버 예약" });
  await expect(phone).toHaveAttribute("href", "tel:18337552");
  await expect(phone).toBeInViewport({ ratio: 1 });
  await expect(booking).toBeInViewport({ ratio: 1 });
  const [phoneBox, bookingBox] = await Promise.all([phone.boundingBox(), booking.boundingBox()]);
  expect(phoneBox!.y).toBe(bookingBox!.y);
  expect(bookingBox!.x).toBeGreaterThan(phoneBox!.x);

  await booking.click();
  await expect(page).toHaveURL(BOOKING_URL);
});
