import { test, expect } from '@playwright/test';

test.describe('Financial Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display financial dashboard heading', async ({ page }) => {
    await expect(page.locator('h2:has-text("금융 대시보드")')).toBeVisible();
  });

  test('should show market data cards', async ({ page }) => {
    const dashboardCards = page.locator('h2:has-text("금융 대시보드") ~ div [class*="rounded"]');
    await expect(dashboardCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display KOSPI index', async ({ page }) => {
    const kospiSection = page.locator('text=KOSPI').first();
    await expect(kospiSection).toBeVisible();
  });

  test('should display KOSDAQ index', async ({ page }) => {
    const kosdaqSection = page.locator('text=KOSDAQ').first();
    await expect(kosdaqSection).toBeVisible();
  });

  test('should show last updated timestamp', async ({ page }) => {
    const timestamp = page.locator('text=마지막 업데이트');
    await expect(timestamp).toBeVisible();
  });

  test('should display loading skeleton initially', async ({ page }) => {
    await page.goto('/');
    const skeleton = page.locator('[class*="animate-pulse"]');
    await expect(skeleton.first()).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to stocks page', async ({ page }) => {
    const stocksLink = page.locator('a:has-text("주식 시장")').first();
    await expect(stocksLink).toBeVisible();
    await stocksLink.click();
    await expect(page).toHaveURL(/stocks/);
  });

  test('should navigate to crypto page', async ({ page }) => {
    const cryptoLink = page.locator('a:has-text("암호화폐")').first();
    if (await cryptoLink.isVisible()) {
      await cryptoLink.click();
      await expect(page).toHaveURL(/crypto/);
    }
  });

  test('should navigate to forex page', async ({ page }) => {
    const forexLink = page.locator('a:has-text("환율")').first();
    if (await forexLink.isVisible()) {
      await forexLink.click();
      await expect(page).toHaveURL(/forex/);
    }
  });
});

test.describe('Stocks Page', () => {
  test('should load stocks page', async ({ page }) => {
    await page.goto('/stocks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('API Health', () => {
  test('health endpoint should return ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('financial dashboard API should return data', async ({ request }) => {
    const response = await request.get('/api/financial/dashboard');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeDefined();
  });

  test('AI news articles API should respond', async ({ request }) => {
    const response = await request.get('/api/ai-it/articles?limit=3');
    expect(response.ok()).toBeTruthy();
  });

  test('AI news sources API should respond', async ({ request }) => {
    const response = await request.get('/api/ai-it/sources');
    expect(response.ok()).toBeTruthy();
  });

  test('AI news stats API should respond', async ({ request }) => {
    const response = await request.get('/api/ai-it/stats');
    expect(response.ok()).toBeTruthy();
  });
});
