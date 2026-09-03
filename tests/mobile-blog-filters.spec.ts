import { test, expect } from '@playwright/test';

test.describe('건강칼럼 모바일 필터', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/blog');
  });

  test('태그 필터는 기본 접힘이고 결과 수를 바로 보여준다', async ({ page }) => {
    const toggle = page.getByRole('button', { name: '상세 필터' });
    const tagFilter = page.locator('#blog-tag-filters');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByText(/\d+개의 글/).first()).toBeVisible();
    await expect(tagFilter.getByRole('button', { name: '생활습관', includeHidden: true })).toBeHidden();
  });

  test('태그 선택 상태를 요약하고 필터를 바로 해제할 수 있다', async ({ page }) => {
    const toggle = page.getByRole('button', { name: '상세 필터' });
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('글 유형·대상')).toBeVisible();
    await page.locator('#blog-tag-filters').getByRole('button', { name: '생활습관' }).click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toContainText('생활습관');
    await page.getByRole('button', { name: '생활습관 필터 해제' }).click();
    await expect(toggle).not.toContainText('생활습관');
  });

  test('가려진 카테고리를 선택하면 화면 안으로 이동한다', async ({ page }) => {
    const scroller = page.locator('[aria-label="건강칼럼 카테고리"]');
    await page.getByRole('button', { name: '건강상식' }).click();

    await expect(page.getByRole('button', { name: '건강상식' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});

test('데스크톱에서는 태그 필터를 항상 노출한다', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/blog');

  await expect(page.getByRole('button', { name: '상세 필터' })).toBeHidden();
  await expect(page.getByRole('button', { name: '생활습관' }).first()).toBeVisible();
});
