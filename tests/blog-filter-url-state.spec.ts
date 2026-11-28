import { test, expect } from '@playwright/test';

test.describe('건강칼럼 필터 URL 상태', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test('공유 URL과 새로고침에서 카테고리와 검색어를 복원한다', async ({ page }) => {
    await page.goto('/blog?category=implant&q=수명');

    await expect(page.getByRole('button', { name: '임플란트', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('searchbox', { name: '건강칼럼 검색' })).toHaveValue('수명');

    const categoryButton = page.getByRole('button', { name: '임플란트', exact: true });
    const categoryScroller = page.locator('[aria-label="건강칼럼 카테고리"]');
    await expect.poll(async () => {
      const buttonBox = await categoryButton.boundingBox();
      const scrollerBox = await categoryScroller.boundingBox();
      if (!buttonBox || !scrollerBox) return false;
      return buttonBox.x >= scrollerBox.x && buttonBox.x + buttonBox.width <= scrollerBox.x + scrollerBox.width;
    }).toBe(true);

    await page.reload();
    await expect(page.getByRole('button', { name: '임플란트', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('searchbox', { name: '건강칼럼 검색' })).toHaveValue('수명');
  });

  test('예전 태그 URL은 숨은 필터 없이 검색어·카테고리만 유지한다', async ({ page }) => {
    await page.goto('/blog?tag=생활습관&category=implant&q=수명');
    await expect(page).not.toHaveURL(/tag=/);
    await expect(page.getByRole('searchbox', { name: '건강칼럼 검색' })).toHaveValue('수명');
    await expect(page.getByRole('button', { name: '임플란트', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page).not.toHaveURL(/tag=/);
    await expect(page.getByRole('searchbox')).toHaveValue('수명');
  });

  test('검색어는 지연 반영되고 지우면 URL에서도 제거된다', async ({ page }) => {
    await page.clock.install();
    await page.goto('/blog');
    const search = page.getByRole('searchbox', { name: '건강칼럼 검색' });
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);

    await search.fill('임플란트 수명');
    await page.clock.runFor(50);
    expect(new URL(page.url()).searchParams.has('q')).toBe(false);
    await page.clock.resume();
    await expect(page).toHaveURL(url => url.searchParams.get('q') === '임플란트 수명');

    await page.getByRole('button', { name: '검색어 지우기' }).click();
    await expect(search).toHaveValue('');
    await expect(page).toHaveURL(url => !url.searchParams.has('q'));
  });

  test('뒤로 가기로 이전 카테고리 상태를 복원한다', async ({ page }) => {
    await page.goto('/blog');
    await page.getByRole('button', { name: '예방관리' }).click();
    await expect(page).toHaveURL(/category=prevention/);
    await page.getByRole('button', { name: '보철치료' }).click();
    await expect(page).toHaveURL(/category=prosthetics/);

    await page.goBack();
    await expect(page.getByRole('button', { name: '예방관리' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/category=prevention/);
  });

  test('유효하지 않은 필터 값은 적용하지 않는다', async ({ page }) => {
    await page.goto('/blog?category=unknown&tag=unknown');

    await expect(page.getByRole('button', { name: '전체', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).not.toHaveURL(/tag=/);
    await expect(page.getByRole('button', { name: '상세 필터' })).toHaveCount(0);
  });
});
