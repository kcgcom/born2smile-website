import { test, expect } from '@playwright/test';

test.describe('모바일 헤더', () => {
  test('작은 가로 화면에서 메뉴를 스크롤해 마지막 전화 버튼에 도달한다', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 320 });
    await page.goto('/');
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    const menu = page.locator('#mobile-menu');
    const phone = menu.getByRole('link', { name: '전화 상담 1833-7552' });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(320);
    await menu.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(phone).toBeInViewport({ ratio: 1 });
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  for (const width of [360, 375, 390]) {
    test(`${width}px에서 한 줄 레이아웃과 터치 영역을 유지한다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');

      const header = page.locator('header');
      const logo = header.getByRole('link', { name: /서울대학교 엠블럼 서울본치과/ });
      const phone = header.getByRole('link', { name: '전화 상담 1833-7552' });
      const menu = header.getByRole('button', { name: '메뉴 열기' });

      await expect(header.getByText('서울본치과', { exact: true })).toBeVisible();
      await expect(header.getByText('서울본치과의원', { exact: true })).toBeHidden();

      const boxes = await Promise.all([
        header.boundingBox(),
        logo.boundingBox(),
        phone.boundingBox(),
        menu.boundingBox(),
      ]);
      const [headerBox, logoBox, phoneBox, menuBox] = boxes;

      expect(headerBox).not.toBeNull();
      expect(logoBox).not.toBeNull();
      expect(phoneBox).not.toBeNull();
      expect(menuBox).not.toBeNull();
      expect(headerBox!.height).toBeLessThanOrEqual(80);
      expect(phoneBox!.width).toBeGreaterThanOrEqual(44);
      expect(phoneBox!.height).toBeGreaterThanOrEqual(44);
      expect(menuBox!.width).toBeGreaterThanOrEqual(44);
      expect(menuBox!.height).toBeGreaterThanOrEqual(44);
      expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(phoneBox!.x);
      expect(phoneBox!.x + phoneBox!.width).toBeLessThanOrEqual(menuBox!.x);

      if (width < 390) {
        await expect(phone.locator('span')).toBeHidden();
      } else {
        await expect(phone.locator('span')).toBeVisible();
      }
    });
  }
});
