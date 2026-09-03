import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('홈페이지 로드', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('서울본치과');
  });

  test('모바일 하단 메뉴를 누르면 열린 상단 메뉴가 닫힌다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await expect(page.locator('#mobile-menu')).toBeVisible();

    // Next.js 개발 도구 버튼이 좌하단 링크 위에 겹칠 수 있어 실제 링크 이벤트를 직접 전달한다.
    await page
      .getByRole('navigation', { name: '빠른 메뉴' })
      .getByRole('link', { name: '홈' })
      .dispatchEvent('click');

    await expect(page.locator('#mobile-menu')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '메뉴 열기' })).toHaveAttribute('aria-expanded', 'false');
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

  test('관리자 기본 진입은 admin 로그인으로 수렴', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('관리자 로그인 경로 유지', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('콘텐츠 워크스페이스 핵심 경로는 로그인으로 보호된다', async ({ page }) => {
    for (const path of [
      '/admin/content/posts',
      '/admin/content/strategy',
      '/admin/content/trends',
      '/admin/content/posts/new',
      '/admin/content/strategy/rules',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test('구형 콘텐츠 서브탭 경로도 계속 로그인으로 수렴한다', async ({ page }) => {
    for (const path of ['/admin/content/schedule', '/admin/content/stats']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });

  test('sitemap.xml', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    const content = await page.content();
    expect(content).toContain('born2smile.co.kr');
  });
});
