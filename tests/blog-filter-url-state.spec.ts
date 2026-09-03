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

  test('태그 선택과 해제가 URL에 반영된다', async ({ page }) => {
    await page.goto('/blog');
    await page.getByRole('button', { name: '상세 필터' }).click();
    await page.locator('#blog-tag-filters').getByRole('button', { name: '생활습관' }).click();

    await expect(page).toHaveURL(/tag=%EC%83%9D%ED%99%9C%EC%8A%B5%EA%B4%80/);
    await expect(page).not.toHaveURL(/category=/);

    await page.getByRole('button', { name: '생활습관 필터 해제' }).click();
    await expect(page).not.toHaveURL(/tag=/);
  });

  test('검색어는 지연 반영되고 지우면 URL에서도 제거된다', async ({ page }) => {
    await page.goto('/blog');
    const search = page.getByRole('searchbox', { name: '건강칼럼 검색' });

    await search.fill('임플란트 수명');
    await expect(page).toHaveURL(/q=%EC%9E%84%ED%94%8C%EB%9E%80%ED%8A%B8\+%EC%88%98%EB%AA%85/);

    await page.getByRole('button', { name: '검색어 지우기' }).click();
    await expect(page).not.toHaveURL(/q=/);
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

    await expect(page.getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: '상세 필터' })).not.toContainText('unknown');
  });
});
