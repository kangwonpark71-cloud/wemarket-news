/**
 * Base Crawler - 크롤러 공통 유틸리티 및 베이스 클래스
 *
 * 모든 크롤러가 공유하는 재시도 로직, 에러 처리, 로깅 패턴을 제공합니다.
 */

import type {
  BaseSourceConfig,
  CrawlerArticle,
  CrawlerFetchResult,
  RetryConfig,
  CrawlerOptions,
} from './types';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CRAWLER_OPTIONS } from './types';

import { createLogger } from '@/lib/logger';;

const log = createLogger('BaseCrawler');

// ============================================================================
// Retry Utility
// ============================================================================

/**
 * 재시도 로직을 구현한 제네릭 함수.
 * 지수 백오프(exponential backoff)를 사용합니다.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  logPrefix: string = 'Crawler',
): Promise<T | null> {
  const cfg: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < cfg.retries) {
        const delay =
          Math.min(
            cfg.baseDelay * Math.pow(cfg.factor || 2, attempt) + Math.random() * 1000,
            cfg.maxDelay || 10000,
          );
        log.warn(
          `[${logPrefix}] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  log.error(`[${logPrefix}] All ${cfg.retries + 1} attempts failed: ${lastError?.message}`);
  return null;
}

// ============================================================================
// Article Normalization
// ============================================================================

/**
 * 다양한 소스의 기사 데이터를 CrawlerArticle로 정규화합니다.
 */
export function normalizeArticle(
  raw: Partial<CrawlerArticle> & { title: string; url: string },
  source: BaseSourceConfig,
): CrawlerArticle {
  return {
    guid: raw.guid || raw.url,
    title: raw.title.trim(),
    url: raw.url.trim(),
    description: raw.description?.substring(0, 500),
    content: raw.content,
    author: raw.author,
    thumbnail: raw.thumbnail,
    publishedAt: raw.publishedAt || new Date(),
    category: raw.category || source.subcategory,
    language: source.language,
    sourceNameEn: source.nameEn,
    sourceName: source.name,
    icon: source.icon,
  };
}

/**
 * 날짜 문자열을 Date 객체로 안전하게 변환합니다.
 */
export function parseDate(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    log.warn(`[BaseCrawler] Invalid date: ${dateStr}, using current time`);
    return new Date();
  }
  return parsed;
}

/**
 * URL을 절대 URL로 변환합니다.
 */
export function resolveUrl(url: string, base: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

// ============================================================================
// Result Factory
// ============================================================================

export function createSuccessResult(
  articles: CrawlerArticle[],
  source: BaseSourceConfig,
  pagesCrawled: number = 1,
): CrawlerFetchResult {
  return {
    articles,
    fetchedAt: new Date(),
    sourceNameEn: source.nameEn,
    sourceName: source.name,
    pagesCrawled,
  };
}

export function createErrorResult(
  error: Error | string,
  source: BaseSourceConfig,
): CrawlerFetchResult {
  const message = error instanceof Error ? error.message : String(error);
  log.error(
    `[BaseCrawler] Error fetching ${source.name} (${source.nameEn}): ${message}`,
  );

  return {
    articles: [],
    error: message,
    fetchedAt: new Date(),
    sourceNameEn: source.nameEn,
    sourceName: source.name,
    pagesCrawled: 0,
  };
}

// ============================================================================
// Thumbnail & Category Extraction
// ============================================================================

export function extractThumbnail(item: Record<string, unknown>): string | undefined {
  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;

  if (mediaContent?.$?.url) return mediaContent.$.url;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;
  return undefined;
}

export function extractCategory(item: Record<string, unknown>): string | undefined {
  const categories = item.categories;
  if (Array.isArray(categories) && categories.length > 0) {
    return String(categories[0]);
  }
  if (typeof categories === 'string') {
    return categories;
  }
  return undefined;
}

// ============================================================================
// Parallel Fetch Helper
// ============================================================================

/**
 * 여러 소스를 병렬로 가져와서 Map으로 수집합니다.
 * Promise.allSettled를 사용하여 개별 실패가 전체에 영향을 주지 않도록 합니다.
 */
export async function fetchAllParallel<T extends CrawlerFetchResult>(
  sources: BaseSourceConfig[],
  fetchFn: (source: BaseSourceConfig) => Promise<T>,
): Promise<Map<string, T>> {
  const results = new Map<string, T>();

  const promises = sources.map(async (source) => {
    try {
      const result = await fetchFn(source);
      results.set(source.nameEn, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.set(source.nameEn, {
        articles: [],
        error: message,
        fetchedAt: new Date(),
        sourceNameEn: source.nameEn,
        sourceName: source.name,
        pagesCrawled: 0,
      } as unknown as T);
    }
  });

  await Promise.allSettled(promises);
  return results;
}

// ============================================================================
// Default Options Helper
// ============================================================================

export function mergeOptions(options?: CrawlerOptions): CrawlerOptions {
  return { ...DEFAULT_CRAWLER_OPTIONS, ...options };
}
