import { test, expect, type Locator } from '@playwright/test';

async function expectMinimumTouchTarget(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test.describe('모바일 터치 영역', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('건강칼럼 검색과 필터 버튼은 최소 44px이다', async ({ page }) => {
    await page.goto('/blog');

    const search = page.getByRole('searchbox', { name: '건강칼럼 검색' });
    await expectMinimumTouchTarget(search);

    for (const button of await page.locator('main section').getByRole('button').all()) {
      await expectMinimumTouchTarget(button);
    }

    await search.fill('임플란트');
    await expectMinimumTouchTarget(page.getByRole('button', { name: '검색어 지우기' }));
  });

  test('FAQ와 진료 상세의 보조 링크는 최소 44px이다', async ({ page }) => {
    await page.goto('/faq');
    await expectMinimumTouchTarget(page.getByRole('link', { name: '진료 안내' }).first());

    await page.goto('/treatments/implant');
    await expectMinimumTouchTarget(page.getByRole('link', { name: '진료 안내' }).first());
    await expectMinimumTouchTarget(
      page.getByRole('link', { name: '건강칼럼에서 더 많은 글 보기' }),
    );
  });

  test('푸터 지도·SNS·개인정보 링크는 최소 44px이다', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');

    await expectMinimumTouchTarget(footer.getByRole('link', { name: /네이버 지도에서 보기/ }));
    await expectMinimumTouchTarget(footer.getByRole('link', { name: /카카오맵에서 보기/ }));
    await expectMinimumTouchTarget(footer.getByRole('link', { name: '개인정보처리방침' }));

    for (const link of await footer.locator('a[aria-label]').all()) {
      await expectMinimumTouchTarget(link);
    }
  });
});
