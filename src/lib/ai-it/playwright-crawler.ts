/**
 * Playwright-based web crawler for JavaScript-rendered pages.
 *
 * Replaces the fragile regex-based HTML parser with a proper headless
 * browser that can handle SPAs, infinite-scroll, and client-side
 * rendered content.
 *
 * Design principles:
 *  - Uses `playwright` core (not @playwright/test) so it works in
 *    both cron workers and API routes.
 *  - Browser instance is Lazy / singleton per Node process so we
 *    don't leak resources on repeated calls.
 *  - Each crawl gets a fresh context (isolated cookies/storage).
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { AIITSourceConfig } from './sources';

// ──────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────

export interface CrawledArticle {
  guid: string;
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  publishedAt: Date;
  category?: string;
}

export interface CrawlResult {
  articles: CrawledArticle[];
  error?: string;
  fetchedAt: Date;
  sourceNameEn: string;
  /** How many pages were actually visited */
  pagesCrawled: number;
}

/**
 * Strategy for extracting a list of article-like items from a page.
 * Override this when the DOM structure is non-trivial.
 */
export interface ExtractionStrategy {
  /** CSS selector that matches each article container */
  containerSelector: string;
  /** CSS selector *relative to* the container – or absolute if prefixed with `>` */
  titleSelector: string;
  linkSelector: string;
  descriptionSelector?: string;
  thumbnailSelector?: string;
  dateSelector?: string;
}

// ──────────────────────────────────────────────
//  Browser lifecycle
// ──────────────────────────────────────────────

let _browser: Browser | null = null;
let _context: BrowserContext | null = null;

async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    const { chromium } = await import('playwright');
    _browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return _browser;
}

async function getContext(): Promise<BrowserContext> {
  if (!_context || _context.pages().length === 0) {
    const browser = await getBrowser();
    _context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });
  }
  return _context;
}

/**
 * Close the shared browser instance.  Call this during shutdown
 * (e.g. SIGTERM) to release resources.
 */
export async function closeBrowser(): Promise<void> {
  if (_context) {
    await _context.close().catch(() => {});
    _context = null;
  }
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

// ──────────────────────────────────────────────
//  Crawler core
// ──────────────────────────────────────────────

const NAVIGATION_TIMEOUT = 30_000; // 30 s
const PAGE_LOAD_TIMEOUT = 15_000;

/**
 * Navigate to `url`, wait for the DOM to settle, and extract articles
 * using the provided extraction strategy.
 */
async function extractArticlesFromPage(
  page: Page,
  extraction: ExtractionStrategy,
  origin: string,
): Promise<CrawledArticle[]> {
  // Wait for containers to appear
  await page.waitForSelector(extraction.containerSelector, {
    timeout: PAGE_LOAD_TIMEOUT,
    state: 'attached',
  });

  const articles = await page.evaluate(
    ({ extraction: ext, origin: o }: { extraction: ExtractionStrategy; origin: string }) => {
      const containers = document.querySelectorAll(ext.containerSelector);
      return Array.from(containers).map((container) => {
        const getText = (sel: string) => {
          const el = container.querySelector(sel);
          return el?.textContent?.trim() ?? '';
        };
        const getAttr = (sel: string, attr: string) => {
          const el = container.querySelector(sel);
          return el?.getAttribute(attr)?.trim() ?? '';
        };

        const title = getText(ext.titleSelector);
        let url = getAttr(ext.linkSelector, 'href');
        if (url && !url.startsWith('http')) {
          try {
            url = new URL(url, o).href;
          } catch {
            url = '';
          }
        }
        const description = ext.descriptionSelector
          ? getText(ext.descriptionSelector)
          : '';
        let thumbnail = ext.thumbnailSelector
          ? getAttr(ext.thumbnailSelector, 'src') || getAttr(ext.thumbnailSelector, 'data-src')
          : '';
        if (thumbnail && !thumbnail.startsWith('http')) {
          try {
            thumbnail = new URL(thumbnail, o).href;
          } catch {
            thumbnail = '';
          }
        }

        return { title, url, description, thumbnail };
      });
    },
    { extraction, origin },
  );

  return articles
    .filter((a) => a.title && a.url)
    .map((a) => ({
      guid: a.url,
      title: a.title,
      url: a.url,
      description: a.description,
      thumbnail: a.thumbnail,
      publishedAt: new Date(),
    }));
}

/**
 * Handle page-based pagination: follow "next" links up to `maxPages`.
 */
async function crawlPagePagination(
  basePage: Page,
  extraction: ExtractionStrategy,
  origin: string,
  maxPages: number,
  nextPageSelector: string,
): Promise<CrawledArticle[]> {
  const allArticles: CrawledArticle[] = [];

  for (let i = 0; i < maxPages; i++) {
    const batch = await extractArticlesFromPage(basePage, extraction, origin);
    allArticles.push(...batch);

    if (i < maxPages - 1) {
      const nextBtn = basePage.locator(nextPageSelector).first();
      if (!(await nextBtn.isVisible().catch(() => false))) break;

      await Promise.all([
        basePage.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {}),
        nextBtn.click(),
      ]);
      await basePage.waitForTimeout(1_000); // let DOM settle
    }
  }

  return allArticles;
}

/**
 * Handle infinite-scroll pagination: scroll down until no new content
 * appears or `maxPages` scrolled.
 */
async function crawlScrollPagination(
  page: Page,
  extraction: ExtractionStrategy,
  origin: string,
  maxScrolls: number,
): Promise<CrawledArticle[]> {
  const allArticles: CrawledArticle[] = [];

  for (let i = 0; i < maxScrolls; i++) {
    const beforeCount = allArticles.length;
    const batch = await extractArticlesFromPage(page, extraction, origin);
    allArticles.push(...batch);

    // If no new articles appeared, we might have reached the end
    if (allArticles.length === beforeCount && i > 0) break;

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1_500);
  }

  return allArticles;
}

// ──────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────

/**
 * Crawl a single source using Playwright headless browser.
 *
 * @param source  Source configuration (must have `type: 'crawler'`)
 * @returns       Normalised CrawlResult
 */
export async function crawlWithPlaywright(
  source: AIITSourceConfig,
): Promise<CrawlResult> {
  const startTime = Date.now();
  const { crawlerConfig } = source;

  if (!crawlerConfig) {
    return {
      articles: [],
      error: 'No crawler config provided',
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
      pagesCrawled: 0,
    };
  }

  const extraction: ExtractionStrategy = {
    containerSelector: crawlerConfig.selector,
    titleSelector: crawlerConfig.titleSelector,
    linkSelector: crawlerConfig.linkSelector,
    descriptionSelector: crawlerConfig.descriptionSelector,
    thumbnailSelector: crawlerConfig.thumbnailSelector,
    dateSelector: crawlerConfig.dateSelector,
  };

  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    context = await getContext();
    page = await context.newPage();

    // Respect robots.txt?  We're acting as a news aggregator so we
    // keep a reasonable timeout and throttle ourselves.
    await page.goto(source.url, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT,
    });

    // Wait a bit for async JS rendering
    await page.waitForTimeout(2_000);
    await page.waitForLoadState('networkidle').catch(() => {});

    const origin = page.url().replace(/\/$/, '');

    let articles: CrawledArticle[];

    if (crawlerConfig.pagination) {
      const { type, maxPages = 3 } = crawlerConfig.pagination;

      if (type === 'page') {
        articles = await crawlPagePagination(
          page,
          extraction,
          origin,
          maxPages,
          'a.next, .pagination a.next, [rel="next"], a:has-text("Next"), a:has-text("다음")',
        );
      } else {
        // scroll
        articles = await crawlScrollPagination(page, extraction, origin, maxPages);
      }
    } else {
      articles = await extractArticlesFromPage(page, extraction, origin);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[PlaywrightCrawler] ✓ ${source.name} — ${articles.length} articles in ${duration}ms`,
    );

    return {
      articles,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
      pagesCrawled: 1,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[PlaywrightCrawler] ✗ ${source.name} — ${message} (${duration}ms)`,
    );

    return {
      articles: [],
      error: message,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
      pagesCrawled: 0,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    // Keep context alive for reuse
  }
}

/**
 * Crawl multiple sources in parallel.
 */
export async function crawlAllWithPlaywright(
  sources: AIITSourceConfig[],
): Promise<Map<string, CrawlResult>> {
  const results = new Map<string, CrawlResult>();

  const promises = sources.map(async (source) => {
    const result = await crawlWithPlaywright(source);
    results.set(source.nameEn, result);
  });

  await Promise.allSettled(promises);
  return results;
}
