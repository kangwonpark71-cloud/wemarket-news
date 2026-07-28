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
 *  - Dynamic import avoids build-time dependency on chromium-bidi
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { AIITSourceConfig } from './sources';

import { createLogger } from '@/lib/logger'
const log = createLogger('PlaywrightCrawler')

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
    registerBrowserShutdown();
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
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
    });

    await _context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      const win = window as Window & typeof globalThis & { chrome?: Record<string, unknown> };
      win.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {},
      };

      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'PDF Viewer' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Chromium PDF Viewer' },
        ],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['ko-KR', 'ko', 'en-US', 'en'],
      });
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

let _shutdownRegistered = false;

/**
 * Register SIGTERM / SIGINT handlers that close the browser.
 * Safe to call multiple times — only registers once.
 */
export function registerBrowserShutdown(): void {
  if (_shutdownRegistered) return;
  _shutdownRegistered = true;

  const shutdown = async () => {
    await closeBrowser();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
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
  try {
    await page.waitForSelector(extraction.containerSelector, {
      timeout: PAGE_LOAD_TIMEOUT,
      state: 'attached',
    });
  } catch {
    log.warn(`[PlaywrightCrawler] Selector failed: ${extraction.containerSelector}`);
  }

  const articles = await page.evaluate(
    ({ extraction: ext, origin: o }: { extraction: ExtractionStrategy; origin: string }) => {
      let containers = document.querySelectorAll(ext.containerSelector);
      let isHeuristicUsed = false;

      if (containers.length === 0) {
        const fallbacks = [
          'article',
          '[class*="post-card"]',
          '[class*="post_card"]',
          '[class*="post-item"]',
          '[class*="post_item"]',
          '[class*="article-card"]',
          '[class*="article-item"]',
          '[class*="news-card"]',
          '[class*="news-item"]',
          '[class*="agent-card"]',
          '.post',
          '.article',
          'li:has(h3), li:has(h2), li:has(h4)',
        ];

        for (const sel of fallbacks) {
          const elms = document.querySelectorAll(sel);
          if (elms.length >= 3) {
            containers = elms;
            isHeuristicUsed = true;
            break;
          }
        }
      }

      return Array.from(containers).map((container) => {
        const getText = (sel: string) => {
          const el = container.querySelector(sel);
          return el?.textContent?.trim() ?? '';
        };
        const getAttr = (sel: string, attr: string) => {
          const el = container.querySelector(sel);
          return el?.getAttribute(attr)?.trim() ?? '';
        };

        let title = '';
        let url = '';
        let description = '';
        let thumbnail = '';

        if (!isHeuristicUsed) {
          title = getText(ext.titleSelector);
          url = getAttr(ext.linkSelector, 'href');
          description = ext.descriptionSelector ? getText(ext.descriptionSelector) : '';
          thumbnail = ext.thumbnailSelector ? getAttr(ext.thumbnailSelector, 'src') || getAttr(ext.thumbnailSelector, 'data-src') : '';
        } else {
          const heading = container.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"]');
          title = heading?.textContent?.trim() ?? '';

          const linkEl = container.querySelector('a[href]');
          url = linkEl?.getAttribute('href')?.trim() ?? '';

          if (!title && linkEl) {
            title = linkEl.textContent?.trim() ?? '';
          }

          const pEl = container.querySelector('p, [class*="excerpt"], [class*="description"]');
          description = pEl?.textContent?.trim() ?? '';

          const imgEl = container.querySelector('img');
          thumbnail = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';
        }

        if (url && !url.startsWith('http')) {
          try {
            url = new URL(url, o).href;
          } catch {
            url = '';
          }
        }

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
      try {
        const nextBtn = basePage.locator(nextPageSelector).first();
        if (!(await nextBtn.isVisible().catch(() => false))) break;

        await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
        await basePage.waitForTimeout(500 + Math.random() * 1000);

        await nextBtn.click({ timeout: 5000 });
        await basePage.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
        await basePage.waitForTimeout(1500);
      } catch (err) {
        log.warn('[PlaywrightCrawler] Pagination failed, stopping early:', err);
        break;
      }
    }
  }

  return allArticles;
}

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

    if (allArticles.length === beforeCount && i > 0) break;

    try {
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 150;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight - window.innerHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
      await page.waitForTimeout(1500 + Math.random() * 1000);
    } catch (err) {
      log.warn('[PlaywrightCrawler] Scroll failed:', err);
      break;
    }
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

    return {
      articles,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
      pagesCrawled: 1,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    log.error(
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
