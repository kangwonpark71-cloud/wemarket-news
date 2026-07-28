/**
 * Playwright Crawler Wrapper - Playwright 크롤러 래퍼
 *
 * 기존 src/lib/ai-it/playwright-crawler.ts의 로직을 공통 Crawler 인터페이스로 래핑합니다.
 * 기존 crawlWithPlaywright 함수와 동일한 동작을 하지만
 * Crawler 인터페이스를 구현하여 통합 관리가 가능합니다.
 */

import { crawlWithPlaywright, crawlAllWithPlaywright } from '@/lib/ai-it/playwright-crawler';
import type { AIITSourceConfig } from '@/lib/ai-it/sources';
import type {
  BaseSourceConfig,
  Crawler,
  CrawlerArticle,
  CrawlerFetchResult,
  CrawlerOptions,
} from './types';
import { createErrorResult } from './base-crawler';

export class PlaywrightCrawler implements Crawler {
  readonly name = 'PlaywrightCrawler';

  constructor(_options?: CrawlerOptions) {}

  async fetch(source: BaseSourceConfig): Promise<CrawlerFetchResult> {
    try {
      // AIITSourceConfig로 변환 (crawlerConfig가 있는 경우)
      const aiitSource = this.toAIITSource(source);
      const result = await crawlWithPlaywright(aiitSource);

      const articles: CrawlerArticle[] = result.articles.map((a) => ({
        guid: a.guid,
        title: a.title,
        url: a.url,
        description: a.description,
        content: undefined,
        author: undefined,
        thumbnail: a.thumbnail,
        publishedAt: a.publishedAt,
        category: a.category || source.subcategory,
        language: source.language,
        sourceNameEn: source.nameEn,
        sourceName: source.name,
        icon: source.icon,
      }));

      return {
        articles,
        error: result.error,
        fetchedAt: result.fetchedAt,
        sourceNameEn: source.nameEn,
        sourceName: source.name,
        pagesCrawled: result.pagesCrawled,
      };
    } catch (error) {
      return createErrorResult(error instanceof Error ? error : new Error(String(error)), source);
    }
  }

  async fetchAll(sources: BaseSourceConfig[]): Promise<Map<string, CrawlerFetchResult>> {
    const aiitSources = sources.map((s) => this.toAIITSource(s));
    const results = await crawlAllWithPlaywright(aiitSources);

    const map = new Map<string, CrawlerFetchResult>();
    for (const [nameEn, result] of results) {
      const articles: CrawlerArticle[] = result.articles.map((a) => ({
        guid: a.guid,
        title: a.title,
        url: a.url,
        description: a.description,
        content: undefined,
        author: undefined,
        thumbnail: a.thumbnail,
        publishedAt: a.publishedAt,
        category: a.category || '',
        language: 'en',
        sourceNameEn: nameEn,
        sourceName: nameEn,
      }));

      map.set(nameEn, {
        articles,
        error: result.error,
        fetchedAt: result.fetchedAt,
        sourceNameEn: nameEn,
        sourceName: nameEn,
        pagesCrawled: result.pagesCrawled,
      });
    }

    return map;
  }

  /**
   * BaseSourceConfig를 AIITSourceConfig로 변환합니다.
   * AI/IT 소스 설정이 필요한 필드만 매핑합니다.
   */
  private toAIITSource(source: BaseSourceConfig): AIITSourceConfig {
    return {
      name: source.name,
      nameEn: source.nameEn,
      url: source.url,
      category: (source.category as 'ai' | 'it') || 'it',
      subcategory: source.subcategory,
      language: source.language,
      icon: source.icon,
      fetchInterval: source.fetchInterval || 1,
      type: 'crawler',
      crawlerConfig: source.crawlerConfig
        ? {
            selector: source.crawlerConfig.selector,
            titleSelector: source.crawlerConfig.titleSelector,
            linkSelector: source.crawlerConfig.linkSelector,
            descriptionSelector: source.crawlerConfig.descriptionSelector,
            thumbnailSelector: source.crawlerConfig.thumbnailSelector,
            dateSelector: source.crawlerConfig.dateSelector,
            pagination: source.crawlerConfig.pagination,
          }
        : undefined,
    };
  }
}

export const playwrightCrawler = new PlaywrightCrawler();
