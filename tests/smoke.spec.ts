import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('홈페이지 로드', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('서울본치과');
  });

  test('진료 목록 페이지', async ({ page }) => {
    const response = await page.goto('/treatments');
    expect(response?.status()).toBe(200);
    const cards = page.locator('[href^="/treatments/"]');
    await expect(cards).toHaveCount(6);
  });

  test('진료 상세 페이지 — 임플란트', async ({ page }) => {
    const response = await page.goto('/treatments/implant');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('임플란트');
    await expect(page.locator('text=자주 묻는 질문')).toBeVisible();
  });

  test('블로그 목록 페이지', async ({ page }) => {
    const response = await page.goto('/blog');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('구형 블로그 URL 리다이렉트', async ({ page }) => {
    const response = await page.goto('/blog/electric-vs-manual-toothbrush');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/blog\/prevention\/electric-vs-manual-toothbrush$/);
  });

  test('FAQ 페이지', async ({ page }) => {
    const response = await page.goto('/faq');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).toContainText('자주 묻는 질문');
  });

  test('404 페이지', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: '홈으로 돌아가기' })).toBeVisible();
  });

  test('sitemap.xml', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('born2smile.co.kr');
  });
});
