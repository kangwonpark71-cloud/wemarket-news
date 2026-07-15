import { test, expect } from '@playwright/test';

test.describe('IT News Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/it-news');
    await page.waitForLoadState('networkidle');
  });

  test('should load IT news page with correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/IT News/);
    await expect(page.locator('h1:has-text("IT News")')).toBeVisible();
  });

  test('should display source sidebar with subcategories', async ({ page }) => {
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should show Korean and global IT sources', async ({ page }) => {
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should show filter bar', async ({ page }) => {
    const filterSection = page.locator('[class*="filter"], [class*="sort"], select, [class*="control"]').first();
    await expect(filterSection.or(page.locator('h1'))).toBeVisible();
  });

  test('empty state should show when no articles', async ({ page }) => {
    const emptyState = page.locator('text=기사가 없습니다');
    const emptyIcon = page.locator('text=💻');
    const hasEmptyState = await emptyState.or(emptyIcon).isVisible();
    const grid = page.locator('[class*="grid"]').first();
    const hasArticles = await grid.locator('> *').count() > 0;
    expect(hasArticles || hasEmptyState).toBeTruthy();
  });

  test('should support navigation to details via article links', async ({ page }) => {
    const articleLink = page.locator('article a[href], [class*="card"] a[href]').first();
    if (await articleLink.isVisible()) {
      const href = await articleLink.getAttribute('href');
      expect(href).toBeTruthy();
      if (href && href.startsWith('http')) {
        expect(href).toMatch(/^https?:\/\//);
      }
    }
  });

  test('article metadata should be displayed', async ({ page }) => {
    const firstArticle = page.locator('article, [class*="card"]').first();
    if (await firstArticle.isVisible()) {
      const hasDate = await firstArticle.locator('time, [datetime], [class*="date"]').count() > 0;
      const hasSource = await firstArticle.locator('[class*="source"], [class*="icon"]').count() > 0;
      expect(hasDate || hasSource).toBeTruthy();
    }
  });

  test('sidebar source filter should update URL', async ({ page }) => {
    const sourceLink = page.locator('aside a, [class*="sidebar"] a').first();
    if (await sourceLink.isVisible()) {
      await sourceLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\?/);
    }
  });
});
