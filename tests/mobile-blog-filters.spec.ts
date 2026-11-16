import { test, expect } from '@playwright/test';

for (const width of [360, 390, 1280, 1440]) {
  test(width + 'px 환자 목록은 검색·카테고리만 제공하고 카드 유형 태그를 표시하지 않는다', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/blog');
    await expect(page.getByRole('searchbox', { name: '건강칼럼 검색' })).toBeVisible();
    await expect(page.getByText(/\d+개의 글/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: '상세 필터' })).toHaveCount(0);
    await expect(page.locator('#blog-tag-filters')).toHaveCount(0);
    const card = page.locator('main article').first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('button')).toHaveCount(1);
    await expect(card.getByRole('button')).toHaveAccessibleName(/공유하기$/);
    await page.getByRole('button', { name: '건강상식', exact: true }).click();
    await expect(page.getByRole('button', { name: '건강상식', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const scroller = page.locator('[aria-label="건강칼럼 카테고리"]');
    await expect.poll(() => scroller.evaluate(element => { const active = element.querySelector('[aria-pressed="true"]')!.getBoundingClientRect(); const box = element.getBoundingClientRect(); return active.left >= box.left && active.right <= box.right + 1; })).toBe(true);
  });
}
