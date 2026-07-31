/**
 * RSS Crawler - RSS 피드 기반 크롤러
 *
 * 기존 src/lib/rss/fetcher.ts의 로직을 공통 Crawler 인터페이스로 래핑합니다.
 * 기존 fetchFeed/fetchAllFeeds 함수와 동일한 동작을 하지만
 * Crawler 인터페이스를 구현하여 통합 관리가 가능합니다.
 */

import Parser from 'rss-parser';
import type {
  BaseSourceConfig,
  Crawler,
  CrawlerArticle,
  CrawlerFetchResult,
  CrawlerOptions,
} from './types';

import { createLogger } from '@/lib/logger';;

const log = createLogger('RSSCrawler');
import {
  withRetry,
  normalizeArticle,
  parseDate,
  extractThumbnail,
  extractCategory,
  createSuccessResult,
  createErrorResult,
  fetchAllParallel,
  mergeOptions,
} from './base-crawler';

const DEFAULT_USER_AGENT =
  'EconomyNews/1.0 (RSS Aggregator; +https://economy-news.example.com)';

export function isExcludedByKeywords(title: string, keywords?: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const normalized = title.toLowerCase();
  return keywords.some((keyword) => keyword && normalized.includes(keyword.toLowerCase()));
}

export class RSSCrawler implements Crawler {
  readonly name = 'RSSCrawler';
  private parser: Parser;

  constructor(options?: CrawlerOptions) {
    const opts = mergeOptions(options);
    this.parser = new Parser({
      timeout: opts.timeout,
      headers: {
        'User-Agent': opts.userAgent || DEFAULT_USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['category', 'categories'],
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'dcCreator'],
        ],
      },
    });
  }

  async fetch(source: BaseSourceConfig): Promise<CrawlerFetchResult> {
    const startTime = Date.now();

    try {
      const result = await withRetry(
        () => this.parser.parseURL(source.url),
        { retries: 3, baseDelay: 2000 },
        `RSS:${source.nameEn}`,
      );

      if (!result) {
        return createErrorResult(
          new Error(`Failed after retries: ${source.url}`),
          source,
        );
      }

      const articles: CrawlerArticle[] = [];

      for (const item of result.feed.items) {
        const title = item.title?.trim();
        const link = item.link?.trim();

        if (!title || !link) continue;

        // 피드 오분류 방지: 제목에 제외 키워드가 포함되면 건너뜀
        if (isExcludedByKeywords(title, source.excludeKeywords)) {
          continue;
        }

        const itemData = item as unknown as Record<string, unknown>;

        let publishedAt: Date;
        if (item.pubDate) {
          publishedAt = parseDate(item.pubDate);
        } else if (item.isoDate) {
          publishedAt = parseDate(item.isoDate);
        } else {
          publishedAt = new Date();
        }

        const contentEncoded = itemData.contentEncoded as string | undefined;
        const content =
          contentEncoded && contentEncoded.length > 100
            ? contentEncoded.substring(0, 5000)
            : itemData.contentSnippet
              ? String(itemData.contentSnippet).substring(0, 500)
              : undefined;

        articles.push(
          normalizeArticle(
            {
              guid: item.guid || item.link,
              title,
              url: link,
              description:
                item.contentSnippet?.substring(0, 500) ||
                item.content?.substring(0, 500),
              content,
              author:
                item.creator ||
                (itemData.dcCreator as string) ||
                source.name,
              thumbnail: extractThumbnail(itemData),
              publishedAt,
              category: extractCategory(itemData) || source.subcategory,
            },
            source,
          ),
        );
      }

      const duration = Date.now() - startTime;
      log.info(
        `[RSSCrawler] Fetched ${articles.length} articles from ${source.nameEn} in ${duration}ms`,
      );

      return createSuccessResult(articles, source);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error(
        `[RSSCrawler] Error fetching ${source.name} (${source.nameEn}) after ${duration}ms: ${message}`,
      );

      return createErrorResult(
        error instanceof Error ? error : new Error(String(error)),
        source,
      );
    }
  }

  async fetchAll(sources: BaseSourceConfig[]): Promise<Map<string, CrawlerFetchResult>> {
    return fetchAllParallel(sources, (source) => this.fetch(source));
  }
}

export const rssCrawler = new RSSCrawler();
