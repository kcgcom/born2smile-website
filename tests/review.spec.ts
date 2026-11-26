import { expect, test } from '@playwright/test';

test('공유한 리뷰 안내 링크에서 사진과 두 플랫폼을 확인할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  const response = await page.goto('/review');
  expect(response?.status()).toBe(200);

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: '방문해 주셔서 감사합니다.', exact: true })).toBeVisible();
  const photo = main.getByRole('img', { name: '서울본치과 대기실' });
  await expect(photo).toBeInViewport({ ratio: 1 });
  expect((await photo.boundingBox())?.height).toBeGreaterThanOrEqual(80);
  await expect(main.getByText('앞으로도 진심을 다해 진료하겠습니다.')).toBeVisible();
  const naver = main.getByRole('link', { name: /네이버 리뷰 남기기/ });
  const google = main.getByRole('link', { name: /Google 리뷰 남기기/ });
  await expect(naver).toHaveAttribute('href', 'https://m.place.naver.com/hospital/698879488/review/visitor');
  await expect(google).toHaveAttribute('href', 'https://search.google.com/local/writereview?placeid=ChIJv6ztq7eGfDURXB0HJQ3ZpQg');
  await expect(naver).toBeInViewport({ ratio: 1 });
  await expect(google).toBeInViewport({ ratio: 1 });

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.born2smile.co.kr/review');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', '서울본치과 리뷰 안내');
});

test('리뷰 안내는 모바일에서 간결한 푸터를 표시하고 데스크톱에서는 병원 정보와 후기 링크를 제공한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/review');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', { name: /전화 상담/ })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: /전화 상담/ })).toBeVisible();
  await expect(footer.getByRole('link', { name: '개인정보처리방침' })).toBeVisible();
  await expect(footer.getByRole('heading', { name: '오시는 길' })).toHaveCount(0);
  await expect(footer.getByRole('heading', { name: '진료시간' })).toHaveCount(0);
  await expect(footer.getByRole('link', { name: /리뷰 남기기/ })).toHaveCount(0);
  await expect(footer.locator(':scope > div').first()).toHaveCSS('padding-bottom', '24px');

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(footer.getByRole('link', { name: /전화 상담/ })).toBeVisible();
  await expect(footer.getByRole('heading', { name: '오시는 길' })).toBeVisible();
  await expect(footer.getByRole('heading', { name: '진료시간' })).toBeVisible();
  await expect(footer.getByRole('link', { name: /Google 리뷰 남기기/ })).toBeVisible();
  await expect(footer.getByRole('link', { name: /Naver 리뷰 남기기/ })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('banner').getByRole('link', { name: /서울대학교 엠블럼 서울본치과/ }).click();
  await expect(page).toHaveURL('/');
  await expect(footer.getByRole('link', { name: /전화 상담/ })).toBeVisible();
  await expect(footer.getByRole('heading', { name: '오시는 길' })).toBeVisible();
  await expect(footer.getByRole('heading', { name: '진료시간' })).toBeVisible();
  await expect(footer.getByRole('link', { name: /리뷰 남기기/ })).toHaveCount(2);
});

test.describe('휴대폰 리뷰 안내', () => {
  test.use({ isMobile: true, hasTouch: true });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    test(`${viewport.width}×${viewport.height}에서 두 리뷰 버튼이 첫 화면에 표시된다`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/review');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expect(page.getByRole('navigation', { name: '빠른 메뉴' })).toHaveCount(0);
      const links = page.getByRole('main').getByRole('link', { name: /리뷰 남기기/ });
      await expect(links).toHaveCount(2);
      for (const link of await links.all()) {
        await expect(link).toBeInViewport({ ratio: 1 });
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
        await link.tap({ trial: true });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
  }

  test('가로로 돌린 화면에서도 스크롤해서 두 링크를 누를 수 있다', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 320 });
    await page.goto('/review');
    const links = page.getByRole('main').getByRole('link', { name: /리뷰 남기기/ });
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await link.tap({ trial: true });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(667);
  });
});

test('리뷰 안내 페이지는 크롤링 규칙에서 차단하고 사이트맵에서 제외한다', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  const rules = (await robots.text()).trim().split(/\r?\n\r?\n/);
  const crawlerGroups = rules.filter((group) => group.startsWith('User-Agent:'));
  expect(crawlerGroups.length).toBeGreaterThan(0);
  for (const group of crawlerGroups) {
    expect(group).toMatch(/^Disallow: \/review$/m);
  }

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain('<loc>https://www.born2smile.co.kr/review</loc>');
});
