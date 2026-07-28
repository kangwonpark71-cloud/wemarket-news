/**
 * Crawler Types - 공통 크롤러 타입 정의
 *
 * RSS, Playwright, AI/IT 모든 크롤러가 공유하는 타입을 정의합니다.
 * 기존 rss-parser 기반 fetcher와 Playwright crawler의 타입을
 * 통합하여 단일 인터페이스로 표준화합니다.
 */

// ============================================================================
// Source Configuration
// ============================================================================

export type SourceType = 'rss' | 'crawler';

export interface BaseSourceConfig {
  name: string;
  nameEn: string;
  url: string;
  category: string;
  subcategory: string;
  language: 'ko' | 'en';
  icon?: string;
  fetchInterval?: number;
  type: SourceType;
  crawlerConfig?: CrawlerConfig;
}

export interface CrawlerConfig {
  selector: string;
  titleSelector: string;
  linkSelector: string;
  descriptionSelector?: string;
  thumbnailSelector?: string;
  dateSelector?: string;
  pagination?: {
    type: 'page' | 'scroll';
    maxPages?: number;
  };
}

// ============================================================================
// Unified Article Type
// ============================================================================

/**
 * 모든 크롤러가 반환하는 통합 기사 타입.
 * RSS fetcher의 ParsedArticle와 Playwright crawler의 CrawledArticle를
 * 통합한 형태입니다.
 */
export interface CrawlerArticle {
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
  sourceName: string;
  icon?: string;
}

// ============================================================================
// Fetch Result
// ============================================================================

export interface CrawlerFetchResult {
  articles: CrawlerArticle[];
  error?: string;
  fetchedAt: Date;
  sourceNameEn: string;
  sourceName: string;
  pagesCrawled: number;
}

// ============================================================================
// Crawler Interface
// ============================================================================

/**
 * 모든 크롤러가 구현해야 하는 인터페이스.
 * RSS crawler와 Playwright crawler가 동일한 인터페이스를 따릅니다.
 */
export interface Crawler {
  /** 크롤러 이름 (로깅용) */
  readonly name: string;

  /**
   * 단일 소스에서 기사를 가져옵니다.
   */
  fetch(source: BaseSourceConfig): Promise<CrawlerFetchResult>;

  /**
   * 여러 소스에서 병렬로 기사를 가져옵니다.
   */
  fetchAll(sources: BaseSourceConfig[]): Promise<Map<string, CrawlerFetchResult>>;
}

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  retries: number;
  baseDelay: number;
  maxDelay?: number;
  factor?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  factor: 2,
};

// ============================================================================
// Crawler Options
// ============================================================================

export interface CrawlerOptions {
  timeout?: number;
  retries?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

export const DEFAULT_CRAWLER_OPTIONS: CrawlerOptions = {
  timeout: 15000,
  retries: 3,
  userAgent: 'EconomyNews/1.0 (Aggregator; +https://economy-news.example.com)',
};
