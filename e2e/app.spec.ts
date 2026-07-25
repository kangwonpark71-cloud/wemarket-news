import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load home page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/경제뉴스/);
  });

  test('should display domestic news section', async ({ page }) => {
    const heading = page.locator('h1:has-text("국내 경제")');
    await expect(heading).toBeVisible();
  });

  test('should show sidebar with domestic sources', async ({ page }) => {
    await expect(page.locator('text=한국 경제')).toBeVisible();
    await expect(page.locator('text=매일 경제')).toBeVisible();
  });

test('should display news list container or empty state', async ({ page }) => {
    const newsList = page.locator('[class*="space-y"]').first();
    const emptyState = page.locator('text=뉴스가 없습니다');
    // Either the news list is visible with articles, or empty state is shown
    const hasArticles = await newsList.isVisible();
    const hasEmptyState = await emptyState.isVisible();
    expect(hasArticles || hasEmptyState).toBeTruthy();
  });

  test('should navigate to overseas page', async ({ page }) => {
    await page.click('nav >> text=해외 경제');
    await expect(page).toHaveURL(/overseas/);
    await expect(page.locator('h1:has-text("해외 경제")')).toBeVisible();
  });

  test('should navigate to all news page', async ({ page }) => {
    await page.click('nav >> text=전체 뉴스');
    await expect(page).toHaveURL(/all/);
    await expect(page.locator('h1:has-text("전체 뉴스")')).toBeVisible();
  });

  test('search input should be visible and functional', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('한국');
    await expect(searchInput).toHaveValue('한국');
  });
});

test.describe('Overseas Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overseas');
    await page.waitForLoadState('networkidle');
  });

  test('should load overseas page', async ({ page }) => {
    await expect(page.locator('h1:has-text("해외 경제")')).toBeVisible();
  });

  test('should show Fed sources in sidebar', async ({ page }) => {
    await expect(page.locator('text=Press Releases')).toBeVisible();
    await expect(page.locator('text=Monetary Policy')).toBeVisible();
    await expect(page.locator('text=Speeches & Testimony')).toBeVisible();
  });

  test('should filter by source', async ({ page }) => {
    await page.click('text=Press Releases');
    await expect(page).toHaveURL(/source=fed_press/);
  });
});

test.describe('All News Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/all');
    await page.waitForLoadState('networkidle');
  });

  test('should load all news page', async ({ page }) => {
    await expect(page.locator('h1:has-text("전체 뉴스")')).toBeVisible();
  });

  test('should show quick filters', async ({ page }) => {
    // Use more specific selector for the quick filter links in the sidebar
    await expect(page.locator('nav[aria-label="빠른 필터"] >> text=전체 뉴스')).toBeVisible();
    await expect(page.locator('nav[aria-label="빠른 필터"] >> text=국내 뉴스만')).toBeVisible();
    await expect(page.locator('nav[aria-label="빠른 필터"] >> text=해외 뉴스만')).toBeVisible();
  });

  test('should filter by language', async ({ page }) => {
    await page.click('text=국내 뉴스만');
    await expect(page).toHaveURL(/language=ko/);

    await page.click('text=해외 뉴스만');
    await expect(page).toHaveURL(/language=en/);
  });
});

test.describe('Article Interactions', () => {
  test.beforeEach(async ({ page, request }) => {
    // Verify articles exist via API before UI tests
    const articlesResp = await request.get('/api/articles?limit=1');
    const articlesData = await articlesResp.json();
    const hasArticles = articlesData?.data?.articles?.length > 0;

    if (!hasArticles) {
      test.skip(hasArticles, 'Skipping: no articles available in database');
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have bookmark button on articles', async ({ page }) => {
    const bookmarkButton = page.locator('button[aria-label="북마크 추가"]').first();
    await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
  });

  test('should have mark read button on unread articles', async ({ page }) => {
    const readButton = page.locator('button[aria-label="읽음으로 표시"]').first();
    await expect(readButton).toBeVisible({ timeout: 5000 });
  });

  test('article links should open in new tab', async ({ page }) => {
    const articleLink = page.locator('article a[target="_blank"]').first();
    await expect(articleLink).toHaveAttribute('target', '_blank');
    await expect(articleLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test.describe('API Endpoints', () => {
  test('articles API should return data', async ({ request }) => {
    const response = await request.get('/api/articles?limit=5');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.articles).toBeInstanceOf(Array);
  });

  test('sources API should return sources', async ({ request }) => {
    const response = await request.get('/api/sources');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('stats API should return statistics', async ({ request }) => {
    const response = await request.get('/api/stats');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.totalArticles).toBeDefined();
  });

  test('fetch-logs API should return logs', async ({ request }) => {
    const response = await request.get('/api/fetch-logs');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});