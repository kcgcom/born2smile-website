import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('홈페이지 로드', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('서울본치과');
  });

  test('모바일 하단의 현재 페이지 링크를 누르면 열린 상단 메뉴가 닫힌다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/treatments');

    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await expect(page.locator('#mobile-menu')).toBeVisible();

    const currentLink = page
      .getByRole('navigation', { name: '빠른 메뉴' })
      .getByRole('link', { name: '진료안내', exact: true });
    await expect(currentLink).toHaveAttribute('aria-current', 'page');
    await currentLink.click();

    await expect(page).toHaveURL('/treatments');
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

  test('다른 카테고리로 접속한 글은 정규 URL로 이동한다', async ({ page }) => {
    const response = await page.goto('/blog/implant/electric-vs-manual-toothbrush');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL('/blog/prevention/electric-vs-manual-toothbrush');
  });

  test('FAQ 페이지', async ({ page }) => {
    const response = await page.goto('/faq');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).toContainText('자주 묻는 질문');
  });

  test('404 페이지', async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on('pageerror', error => {
      if (/hydration|minified react error #418/i.test(error.message)) hydrationErrors.push(error.message);
    });
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    const main = page.getByRole('main');
    await expect(main).toHaveCount(1);
    await expect(main.getByRole('heading', { name: '404' })).toBeVisible();
    await main.getByRole('link', { name: '홈으로 돌아가기' }).click();
    await expect(page).toHaveURL('/');
    expect(hydrationErrors).toEqual([]);
  });

  test('관리자 기본 진입은 admin 로그인으로 수렴', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('원장과 직원 로그인 화면의 인증 방식을 분리한다', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByText('관리자 전용', { exact: true })).toBeVisible();
    await expect(page.getByText('등록된 관리자 계정만 접근 가능합니다', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google 로그인', exact: true })).toBeVisible();
    await expect(page.getByLabel('이메일', { exact: true })).toHaveCount(0);

    await page.goto('/staff/tasks');
    await expect(page).toHaveURL(/\/staff\/login$/);
    await expect(page.getByText('직원 전용', { exact: true })).toBeVisible();
    await expect(page.getByText('등록된 직원 계정만 접근 가능합니다', { exact: true })).toBeVisible();
    await expect(page.getByLabel('이메일', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Google 로그인', exact: true })).toHaveCount(0);
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

  test('사용하지 않는 관리자·직원 주소는 404를 반환한다', async ({ request }) => {
    const retiredPaths = [
      '/admin/operations',
      '/admin/system/devtools',
      '/admin/content/strategy/evidence',
      '/staff/system/settings',
      '/staff/system/hours',
      '/staff/system/first-visit',
      '/staff/system/first-visit/review',
      '/staff/system/insurance-forms',
      '/staff/content/posts',
      '/staff/content/posts/example?from=schedule',
      '/staff/content/tasks',
      '/staff/content/review',
      '/staff/content/revisions/example',
      '/staff/content/schedule',
      '/staff/content/images',
      '/staff/first-visit',
      '/staff/posts/new',
    ];
    for (const path of retiredPaths) {
      const response = await request.get(path, {
        maxRedirects: 0,
        headers: { Cookie: 'sb-ui-test-auth-token=test-marker' },
      });
      expect(response.status(), path).toBe(404);
    }
  });

  test('현재 직원 주소는 로그인으로 보호된다', async ({ request }) => {
    for (const path of ['/staff', '/staff/first-visit/review', '/staff/insurance-forms', '/staff/posts', '/staff/tasks', '/staff/review', '/staff/schedule', '/staff/images', '/staff/revisions/example']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(307);
      expect(new URL(response.headers().location, response.url()).pathname).toBe('/staff/login');
    }
  });

  test('구형 콘텐츠 서브탭 경로도 계속 로그인으로 수렴한다', async ({ page }) => {
    for (const path of ['/admin/content/schedule', '/admin/content/stats']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
  });
});
