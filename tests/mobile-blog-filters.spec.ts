import { test, expect } from '@playwright/test';

test('좁은 화면에서 선택한 카테고리가 보이고 공개 카드에는 내부 유형 태그가 없다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/blog');
  const search = page.getByRole('searchbox', { name: '건강칼럼 검색' });
  await expect(search).toBeVisible();
  await expect(page.getByRole('button', { name: '상세 필터' })).toHaveCount(0);

  const category = page.getByRole('button', { name: '건강상식', exact: true });
  await category.click();
  await expect(category).toHaveAttribute('aria-pressed', 'true');
  await expect(category).toBeInViewport({ ratio: 1 });

  // 이 글은 내부 유형 태그가 붙어 있어 공개 카드에 태그가 노출되는 회귀를 확인할 수 있다.
  const title = '찬물 마시면 이가 시려요';
  await search.fill(title);
  const card = page.getByRole('article').filter({
    has: page.getByRole('link', { name: title, exact: true }),
  });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: /공유하기$/ })).toBeVisible();
  await expect(card.getByText(/^증상\s*가이드$/)).toBeHidden();
});
