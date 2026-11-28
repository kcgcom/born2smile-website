import { test, expect } from '@playwright/test';

test.describe('모바일 헤더', () => {
  test('리뷰 안내의 모바일 헤더에는 홈 링크만 표시한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/review');

    const header = page.getByRole('banner');
    const home = header.getByRole('link', { name: /서울대학교 엠블럼 서울본치과/ });
    const phone = header.getByRole('link', { name: '전화 상담 1833-7552' });
    const menu = header.getByRole('button', { name: '메뉴 열기' });
    await expect(home).toHaveAttribute('href', '/');
    await expect(menu).toHaveCount(0);
    await expect(phone).toBeHidden();

    await page.setViewportSize({ width: 768, height: 844 });
    await expect(phone).toBeVisible();
    await expect(phone).toHaveAttribute('href', 'tel:18337552');
    const phoneBox = (await phone.boundingBox())!;
    expect(phoneBox.width).toBeGreaterThanOrEqual(44);
    expect(phoneBox.height).toBeGreaterThanOrEqual(44);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(phone).toBeVisible();
    await expect(header.getByRole('navigation', { name: '메인 메뉴' })).toBeVisible();
    await expect(home.getByText('서울본치과의원', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const logo = home.getByRole('img', { name: '서울대학교 엠블럼' });
    const clinicName = home.getByText('서울본치과', { exact: true });
    await expect(clinicName).toBeVisible();
    const logoBox = await logo.boundingBox();
    const clinicNameBox = await clinicName.boundingBox();
    expect(logoBox).not.toBeNull();
    expect(clinicNameBox).not.toBeNull();

    await home.click();
    await expect(page).toHaveURL('/');
    await expect(clinicName).toBeVisible();
    await expect.poll(() => logo.boundingBox()).toEqual(logoBox);
    await expect.poll(() => clinicName.boundingBox()).toEqual(clinicNameBox);
    await expect(phone).toBeHidden();
    await page.setViewportSize({ width: 768, height: 844 });
    await expect(phone).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await menu.click();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.goBack();
    await expect(page).toHaveURL('/review');
    await expect(menu).toHaveCount(0);
    await expect(header.getByRole('navigation', { name: '모바일 메뉴' })).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

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

  for (const width of [320, 375, 390]) {
    test(`${width}px 상담 안내에서 헤더 전화 없이 메뉴를 표시한다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/contact');

      const header = page.locator('header');
      const logo = header.getByRole('link', { name: /서울대학교 엠블럼 서울본치과/ });
      const phone = header.getByRole('link', { name: '전화 상담 1833-7552' });
      const menu = header.getByRole('button', { name: '메뉴 열기' });

      await expect(header.getByText('서울본치과', { exact: true })).toBeVisible();
      await expect(header.getByText('서울본치과의원', { exact: true })).toBeHidden();
      await expect(phone).toBeHidden();
      await expect(page.getByRole('navigation', { name: '빠른 메뉴' }).getByRole('link', { name: '문의 / 예약' })).toBeVisible();
      await expect(page.getByRole('main').getByRole('link', { name: '대표전화 1833-7552' })).toHaveAttribute('href', 'tel:18337552');

      const [headerBox, logoBox, menuBox] = await Promise.all([
        header.boundingBox(),
        logo.boundingBox(),
        menu.boundingBox(),
      ]);

      expect(headerBox).not.toBeNull();
      expect(logoBox).not.toBeNull();
      expect(menuBox).not.toBeNull();
      expect(headerBox!.height).toBeLessThanOrEqual(80);
      expect(menuBox!.width).toBeGreaterThanOrEqual(44);
      expect(menuBox!.height).toBeGreaterThanOrEqual(44);
      expect(logoBox!.x + logoBox!.width).toBeLessThanOrEqual(menuBox!.x);
    });
  }
});
