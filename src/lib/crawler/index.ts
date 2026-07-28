/**
 * Crawler Index - 통합 크롤러 진입점
 *
 * 모든 크롤러(RSS, Playwright)를 하나의 인터페이스로 통합합니다.
 * 소스 타입에 따라 적절한 크롤러를 자동 선택합니다.
 *
 * 사용 예시:
 *   import { crawler } from '@/lib/crawler';
 *   const result = await crawler.fetch(source);
 *   const allResults = await crawler.fetchAll(sources);
 */

import { RSSCrawler, rssCrawler } from './rss-crawler';
import { PlaywrightCrawler, playwrightCrawler } from './playwright-crawler';
import type {
  BaseSourceConfig,
  Crawler,
  CrawlerFetchResult,
  CrawlerOptions,
} from './types';


// ============================================================================
// Unified Crawler
// ============================================================================

/**
 * 소스 타입에 따라 적절한 크롤러를 자동 선택하는 통합 크롤러.
 * - type: 'rss' → RSSCrawler
 * - type: 'crawler' → PlaywrightCrawler
 */
export class UnifiedCrawler implements Crawler {
  readonly name = 'UnifiedCrawler';

  private rss: RSSCrawler;
  private playwright: PlaywrightCrawler;

  constructor(options?: CrawlerOptions) {
    this.rss = new RSSCrawler(options);
    this.playwright = new PlaywrightCrawler(options);
  }

  async fetch(source: BaseSourceConfig): Promise<CrawlerFetchResult> {
    if (source.type === 'crawler') {
      return this.playwright.fetch(source);
    }
    return this.rss.fetch(source);
  }

  async fetchAll(sources: BaseSourceConfig[]): Promise<Map<string, CrawlerFetchResult>> {
    // RSS와 Playwright 소스를 분리하여 처리
    const rssSources = sources.filter((s) => s.type !== 'crawler');
    const crawlerSources = sources.filter((s) => s.type === 'crawler');

    const results = new Map<string, CrawlerFetchResult>();

    // 병렬로 처리
    const [rssResults, crawlerResults] = await Promise.all([
      rssSources.length > 0
        ? this.rss.fetchAll(rssSources)
        : Promise.resolve(new Map<string, CrawlerFetchResult>()),
      crawlerSources.length > 0
        ? this.playwright.fetchAll(crawlerSources)
        : Promise.resolve(new Map<string, CrawlerFetchResult>()),
    ]);

    // 결과 병합
    for (const [key, value] of rssResults) {
      results.set(key, value);
    }
    for (const [key, value] of crawlerResults) {
      results.set(key, value);
    }

    return results;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const crawler = new UnifiedCrawler();

// ============================================================================
// Re-exports
// ============================================================================

export { RSSCrawler, rssCrawler };
export { PlaywrightCrawler, playwrightCrawler };
export type {
  BaseSourceConfig,
  Crawler,
  CrawlerArticle,
  CrawlerFetchResult,
  CrawlerConfig,
  CrawlerOptions,
  RetryConfig,
  SourceType,
} from './types';
export {
  withRetry,
  normalizeArticle,
  parseDate,
  resolveUrl,
  createSuccessResult,
  createErrorResult,
  extractThumbnail,
  extractCategory,
  fetchAllParallel,
  mergeOptions,
} from './base-crawler';
export { DEFAULT_RETRY_CONFIG, DEFAULT_CRAWLER_OPTIONS } from './types';
