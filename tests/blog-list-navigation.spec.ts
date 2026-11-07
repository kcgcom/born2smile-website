import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  for (const returnMethod of ['back', 'link'] as const) {
    test(`${width}px ${returnMethod}: 추가 로드한 글과 탐색 위치를 복원한다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/blog?q=치');
      const cards = page.locator('main article');
      await expect(page.getByRole('searchbox')).toHaveValue('치');
      await page.getByLabel('추가 글 로딩 중').scrollIntoViewIfNeeded();
      await expect.poll(() => cards.count()).toBeGreaterThan(12);
      const link = cards.nth(14).locator('h2 a');
      await link.scrollIntoViewIfNeeded();
      const title = await link.innerText();
      const y = await page.evaluate(() => scrollY);
      const count = await cards.count();
      await link.click();
      await expect(page.locator('h1')).toHaveText(title);
      if (returnMethod === 'back') await page.goBack();
      else await page.getByRole('link', { name: '칼럼 목록', exact: true }).click();
      await expect(page).toHaveURL(/\/blog\?q=/);
      await expect(page.getByRole('searchbox')).toHaveValue('치');
      await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(count);
      await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - y)).toBeLessThan(8);
      await expect(cards.nth(14).locator('h2 a')).toHaveText(title);
    });
  }
}

test('직접 진입한 글의 목록 링크는 해당 카테고리로 이동한다', async ({ page }) => {
  await page.goto('/blog/health-tips/teeth-sensitivity-causes');
  await page.getByRole('link', { name: '칼럼 목록', exact: true }).click();
  await expect(page).toHaveURL(/\/blog\/health-tips$/);
});

for (const filter of ['category=health-tips', `tag=${encodeURIComponent('증상가이드')}`]) {
  test(`${filter}: 하단 목록 링크로 검색과 필터를 함께 복원한다`, async ({ page }) => {
    await page.goto(`/blog?${filter}&q=치`);
    const link = page.locator('main article h2 a').first();
    const title = await link.innerText();
    await link.click();
    await expect(page.locator('h1')).toHaveText(title);
    await page.getByRole('link', { name: '칼럼 목록으로', exact: true }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('치');
    if (filter.startsWith('category')) {
      await expect(page.getByRole('button', { name: '건강상식', exact: true })).toHaveAttribute('aria-pressed', 'true');
    } else {
      await expect(page.getByRole('button', { name: '상세 필터' })).toContainText('증상가이드');
      await expect(page.locator('#blog-tag-filters')).toBeHidden();
    }
  });
}
