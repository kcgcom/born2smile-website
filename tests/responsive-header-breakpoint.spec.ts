import { test, expect } from '@playwright/test';

test.describe('반응형 헤더 전환', () => {
  for (const width of [768, 900, 1023]) {
    test(`${width}px에서는 한 줄 모바일형 헤더를 유지한다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/treatments');

      const header = page.locator('header');
      const desktopNav = header.getByRole('navigation', { name: '메인 메뉴' });
      const menuButton = header.getByRole('button', { name: '메뉴 열기' });

      await expect(desktopNav).toBeHidden();
      await expect(menuButton).toBeVisible();

      const headerBox = await header.locator(':scope > div').boundingBox();
      expect(headerBox).not.toBeNull();
      expect(headerBox!.height).toBeLessThanOrEqual(80);

      await menuButton.click();
      await expect(header.getByRole('navigation', { name: '모바일 메뉴' })).toBeVisible();
    });
  }

  test('1024px부터 데스크톱 메뉴를 한 줄로 표시한다', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/treatments');

    const header = page.locator('header');
    const desktopNav = header.getByRole('navigation', { name: '메인 메뉴' });

    await expect(desktopNav).toBeVisible();
    await expect(header.getByRole('button', { name: '메뉴 열기' })).toBeHidden();

    const headerBox = await header.locator(':scope > div').boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.height).toBeLessThanOrEqual(80);

    for (const label of ['병원 소개', '진료 안내', '건강칼럼', '상담 안내']) {
      const linkBox = await desktopNav.getByRole('link', { name: label }).boundingBox();
      expect(linkBox).not.toBeNull();
      expect(linkBox!.height).toBeLessThanOrEqual(24);
    }
  });
});
