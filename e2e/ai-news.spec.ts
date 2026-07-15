import { test, expect } from '@playwright/test';

test.describe('AI News Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-news');
    await page.waitForLoadState('networkidle');
  });

  test('should load AI news page with correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/AI News/);
    await expect(page.locator('h1:has-text("AI News")')).toBeVisible();
  });

  test('should display source sidebar', async ({ page }) => {
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('should display subcategory filters in sidebar', async ({ page }) => {
    const openaiLink = page.locator('a:has-text("OpenAI"), a:has-text("openai")').first();
    const anthropicLink = page.locator('a:has-text("Anthropic"), a:has-text("anthropic")').first();
    await expect(openaiLink.or(anthropicLink)).toBeVisible();
  });

  test('should show filter bar with source and sort options', async ({ page }) => {
    const filterSection = page.locator('[class*="filter"], [class*="sort"]').first();
    await expect(filterSection).toBeVisible();
  });

  test('empty state should show when no articles', async ({ page }) => {
    const emptyState = page.locator('text=기사가 없습니다');
    const articles = page.locator('[class*="grid"]').first();
    const hasArticles = await articles.locator('> *').count() > 0;
    const hasEmptyState = await emptyState.isVisible();
    expect(hasArticles || hasEmptyState).toBeTruthy();
  });

  test('should support pagination when multiple pages exist', async ({ page }) => {
    const paginationNav = page.locator('nav[aria-label="페이지네이션"]');
    const nextButton = paginationNav.locator('a[aria-label="다음 페이지"], a:has-text("→")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test('should navigate via sidebar subcategory link', async ({ page }) => {
    const subcategoryLink = page.locator('aside a, [class*="sidebar"] a').first();
    if (await subcategoryLink.isVisible()) {
      const href = await subcategoryLink.getAttribute('href');
      await subcategoryLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('subcategory=');
    }
  });

  test('should have article cards with proper structure', async ({ page }) => {
    const articles = page.locator('article').first();
    if (await articles.isVisible()) {
      const articleLink = articles.locator('a[href]').first();
      await expect(articleLink).toBeVisible();
      const hasTitle = await articles.locator('h3, h2').count() > 0;
      expect(hasTitle).toBeTruthy();
    }
  });
});
