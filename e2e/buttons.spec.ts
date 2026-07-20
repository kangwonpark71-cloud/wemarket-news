import { test, expect, type Page } from '@playwright/test';

// Collects page errors so a single click that throws is surfaced as a failure.
async function attachErrorCollector(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test.describe('Public button smoke test', () => {
  test('home: nav links, search submit, theme toggle, mobile nav', async ({ page }) => {
    const errors = await attachErrorCollector(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const label of ['국내 경제', '해외 경제', '전체 뉴스', 'AI 뉴스', 'IT 뉴스']) {
      const link = page.locator('nav a', { hasText: label }).first();
      if (await link.count()) {
        await link.click();
        await expect(page).toHaveURL(/./);
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }

    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"]').first();
    if (await searchInput.count()) {
      await searchInput.fill('경제');
      await searchInput.press('Enter');
      await expect(page).toHaveURL(/search/);
    }

    const themeBtn = page.getByRole('button', { name: /테마|다크|라이트|시스템|theme/i }).first();
    if (await themeBtn.count()) {
      await themeBtn.click();
      await themeBtn.click();
      await themeBtn.click();
    }

    await page.setViewportSize({ width: 390, height: 800 });
    const hamburger = page.getByRole('button', { name: /메뉴|menu|☰/i }).first();
    if (await hamburger.count()) {
      await hamburger.click();
      const drawer = page.getByRole('dialog').or(page.locator('nav')).first();
      await expect(drawer).toBeVisible();
      await page.keyboard.press('Escape');
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('article detail: bookmark, read, share menu', async ({ page }) => {
    const errors = await attachErrorCollector(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const firstArticle = page.locator('a[href*="/articles/"]').first();
    if (!(await firstArticle.count())) {
      test.skip(true, 'No articles on home to open');
      return;
    }
    await firstArticle.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/articles\//);

    const bookmarkBtn = page.getByRole('button', { name: /북마크|bookmark/i }).first();
    if (await bookmarkBtn.count()) {
      await bookmarkBtn.click();
      await bookmarkBtn.click();
    }

    const readBtn = page.getByRole('button', { name: /읽음|read/i }).first();
    if (await readBtn.count()) {
      await readBtn.click();
    }

    const shareBtn = page.getByRole('button', { name: /공유|share/i }).first();
    if (await shareBtn.count()) {
      await shareBtn.click();
      const copyItem = page.getByRole('menuitem', { name: /복사|copy/i }).first();
      await expect(copyItem).toBeVisible();
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('bookmarks page: tab switch', async ({ page }) => {
    const errors = await attachErrorCollector(page);
    await page.goto('/bookmarks');
    await page.waitForLoadState('networkidle');

    const readTab = page.getByRole('tab', { name: /읽은 기사/i }).first();
    if (await readTab.count()) {
      await readTab.click();
      const bookmarkedTab = page.getByRole('tab', { name: /북마크/i }).first();
      await bookmarkedTab.click();
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('search page: autocomplete + scope chips', async ({ page }) => {
    const errors = await attachErrorCollector(page);
    await page.goto('/search?q=경제');
    await page.waitForLoadState('networkidle');

    const aiTab = page.getByRole('button', { name: /AI·IT|AI IT/i }).first();
    if (await aiTab.count()) {
      await aiTab.click();
      const allTab = page.getByRole('button', { name: /전체/i }).first();
      await allTab.click();
    }

    const input = page.locator('input[type="search"]').first();
    if (await input.count()) {
      await input.fill('주식');
      await input.press('Enter');
      await expect(page).toHaveURL(/q=%EC%A3%BC%EC%8B%9D|q=주식/);
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('list pages load without errors', async ({ page }) => {
    const errors = await attachErrorCollector(page);
    for (const route of ['/ai-news', '/it-news', '/overseas', '/all', '/stocks', '/crypto', '/forex', '/global']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
    }
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
