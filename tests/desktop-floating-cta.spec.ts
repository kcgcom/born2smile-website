import { test, expect } from '@playwright/test';

test.describe('데스크톱 플로팅 전화', () => {
  test('상담 페이지에서는 중복 플로팅 전화를 숨긴다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/contact');

    await expect(page.getByTestId('desktop-floating-cta')).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: '전화 상담 1833-7552' })).toBeVisible();
  });

  test('1280px에서는 버튼이 콘텐츠 밖에 있고 상태는 상호작용할 때 나타난다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/treatments');

    const floating = page.getByTestId('desktop-floating-cta');
    const status = page.getByTestId('desktop-floating-status');
    const button = floating.getByRole('link', { name: /전화 상담/ });
    const box = await floating.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(1216);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);
    await expect(status).toHaveCSS('opacity', '0');
    await button.hover();
    await expect(status).toHaveCSS('opacity', '1');
    await expect(status).toHaveCSS('pointer-events', 'none');
  });

  test('1440px에서는 상태를 항상 보여준다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByTestId('desktop-floating-status')).toHaveCSS('opacity', '1');
  });

  test('1280px 미만에서는 헤더 전화를 사용한다', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    await expect(page.getByTestId('desktop-floating-cta')).toBeHidden();
    await expect(page.locator('header').getByRole('link', { name: '전화 상담 1833-7552' })).toBeVisible();
  });
});
