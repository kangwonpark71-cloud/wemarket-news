import Parser from 'rss-parser';
import { AIITSourceConfig } from './sources';
import { crawlWithPlaywright } from './playwright-crawler';
import { extractThumbnail, extractCategory, fetchWithRetry } from '../utils/rss-helper';

import { crawler } from '@/lib/crawler';
import type { BaseSourceConfig, CrawlerFetchResult } from '@/lib/crawler';

export async function fetchAIITFeedStandardized(
  source: AIITSourceConfig
): Promise<CrawlerFetchResult> {
  const baseSource: BaseSourceConfig = {
    name: source.name,
    nameEn: source.nameEn,
    url: source.url,
    category: source.category,
    subcategory: source.subcategory,
    language: source.language,
    icon: source.icon,
    fetchInterval: source.fetchInterval,
    type: source.type,
    crawlerConfig: source.crawlerConfig,
  };

  return crawler.fetch(baseSource);
}

export interface AIITParsedArticle {
  guid?: string;
  title: string;
  url: string;
  description?: string;
  content?: string;
  author?: string;
  thumbnail?: string;
  publishedAt: Date;
  category?: string;
  language: 'ko' | 'en';
  sourceNameEn: string;
}

export interface AIITFetchResult {
  articles: AIITParsedArticle[];
  error?: string;
  fetchedAt: Date;
  sourceNameEn: string;
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'EconomyNews/1.0 (AI&IT News Aggregator; +https://economy-news.example.com)',
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

function extractContent(item: Record<string, unknown>): string | undefined {
  const contentEncoded = item.contentEncoded as string | undefined;
  if (contentEncoded && contentEncoded.length > 100) {
    return contentEncoded.substring(0, 5000);
  }
  const contentSnippet = item.contentSnippet as string | undefined;
  if (contentSnippet) {
    return contentSnippet.substring(0, 500);
  }
  return undefined;
}

export async function fetchAIITFeed(
  source: AIITSourceConfig
): Promise<AIITFetchResult> {
  const startTime = Date.now();

  try {
    if (source.type === 'crawler') {
      return await fetchWithCrawler(source);
    }

    const result = await fetchWithRetry(parser, source.url, 'AIIT RSS Fetcher', 3, 2000);

    if (!result) {
      return {
        articles: [],
        error: `Failed after retries: ${source.url}`,
        fetchedAt: new Date(),
        sourceNameEn: source.nameEn,
      };
    }

    const articles: AIITParsedArticle[] = [];

    for (const item of result.feed.items) {
      const title = item.title?.trim();
      const link = item.link?.trim();

      if (!title || !link) continue;

      const itemData = item as unknown as Record<string, unknown>;

      let publishedAt: Date;
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate);
      } else {
        publishedAt = new Date();
      }

      if (isNaN(publishedAt.getTime())) {
        publishedAt = new Date();
      }

      articles.push({
        guid: item.guid || item.link,
        title,
        url: link,
        description: item.contentSnippet?.substring(0, 500) || item.content?.substring(0, 500),
        content: extractContent(itemData),
        author: item.creator || (itemData.dcCreator as string) || source.name,
        thumbnail: extractThumbnail(itemData),
        publishedAt,
        category: extractCategory(itemData) || source.subcategory,
        language: source.language,
        sourceNameEn: source.nameEn,
      });
    }

    return {
      articles,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AIIT RSS Fetcher] Error fetching ${source.name} (${source.nameEn}) after ${duration}ms: ${errorMessage}`);

    return {
      articles: [],
      error: errorMessage,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
    };
  }
}

async function fetchWithCrawler(
  source: AIITSourceConfig
): Promise<AIITFetchResult> {
  const result = await crawlWithPlaywright(source);

  const articles: AIITParsedArticle[] = result.articles.map((a) => ({
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
  }));

  return {
    articles,
    error: result.error,
    fetchedAt: result.fetchedAt,
    sourceNameEn: source.nameEn,
  };
}

export async function fetchAllAIITFeeds(
  sources: AIITSourceConfig[]
): Promise<Map<string, AIITFetchResult>> {
  const results = new Map<string, AIITFetchResult>();

  const fetchPromises = sources.map(async (source) => {
    const result = await fetchAIITFeed(source);
    results.set(source.nameEn, result);
  });

  await Promise.allSettled(fetchPromises);
  return results;
}