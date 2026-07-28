/**
 * Test Utilities - 공통 테스트 유틸리티
 *
 * 테스트에서 재사용하는 Mock 팩토리, 정리 헬퍼, 자동 정리 메커니즘을 제공합니다.
 * 모든 테스트가 일관된 Mock 데이터와 정리 패턴을 사용하도록 합니다.
 */

import type {
  BaseSourceConfig,
  CrawlerArticle,
  CrawlerFetchResult,
} from '@/lib/crawler';

// ============================================================================
// Mock Factory: BaseSourceConfig
// ============================================================================

export function createMockSource(
  overrides: Partial<BaseSourceConfig> = {},
): BaseSourceConfig {
  return {
    name: 'Test Source',
    nameEn: 'test_source',
    url: 'https://example.com/feed',
    category: 'test',
    subcategory: 'test_sub',
    language: 'en',
    icon: '🧪',
    fetchInterval: 1,
    type: 'rss',
    ...overrides,
  };
}

export function createMockCrawlerSource(
  overrides: Partial<BaseSourceConfig> = {},
): BaseSourceConfig {
  return createMockSource({
    type: 'crawler',
    crawlerConfig: {
      selector: '.article',
      titleSelector: 'h2',
      linkSelector: 'a',
      descriptionSelector: 'p',
      thumbnailSelector: 'img',
    },
    ...overrides,
  });
}

// ============================================================================
// Mock Factory: CrawlerArticle
// ============================================================================

export function createMockArticle(
  overrides: Partial<CrawlerArticle> = {},
): CrawlerArticle {
  return {
    guid: 'test-guid-1',
    title: 'Test Article Title',
    url: 'https://example.com/article/1',
    description: 'This is a test article description.',
    content: 'Full content of the test article.',
    author: 'Test Author',
    thumbnail: 'https://example.com/image.jpg',
    publishedAt: new Date('2024-01-15T10:30:00Z'),
    category: 'test_sub',
    language: 'en',
    sourceNameEn: 'test_source',
    sourceName: 'Test Source',
    icon: '🧪',
    ...overrides,
  };
}

export function createMockArticles(
  count: number,
  sourceNameEn: string = 'test_source',
): CrawlerArticle[] {
  return Array.from({ length: count }, (_, i) =>
    createMockArticle({
      guid: `test-guid-${i + 1}`,
      title: `Test Article ${i + 1}`,
      url: `https://example.com/article/${i + 1}`,
      sourceNameEn,
    }),
  );
}

// ============================================================================
// Mock Factory: CrawlerFetchResult
// ============================================================================

export function createMockFetchResult(
  source: BaseSourceConfig,
  articles: CrawlerArticle[] = [],
  error?: string,
): CrawlerFetchResult {
  return {
    articles,
    error,
    fetchedAt: new Date(),
    sourceNameEn: source.nameEn,
    sourceName: source.name,
    pagesCrawled: error ? 0 : 1,
  };
}

// ============================================================================
// Mock Fetch Utilities
// ============================================================================

export interface MockFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: Headers;
}

export function mockFetchResponse(
  data: unknown,
  options: Partial<MockFetchResponse> = {},
): MockFetchResponse {
  const isJson = typeof data === 'object' && data !== null;
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(isJson ? JSON.stringify(data) : String(data)),
    headers: options.headers ?? new Headers(),
  };
}

export function mockFetchError(message: string): jest.Mock {
  return jest.fn(() => Promise.reject(new Error(message)));
}

// ============================================================================
// Cleanup Registry
// ============================================================================

type CleanupFn = () => void | Promise<void>;

const cleanupRegistry: CleanupFn[] = [];

export function registerCleanup(fn: CleanupFn): void {
  cleanupRegistry.push(fn);
}

export async function runAllCleanups(): Promise<void> {
  while (cleanupRegistry.length > 0) {
    const fn = cleanupRegistry.pop();
    if (fn) {
      try {
        await fn();
      } catch (error) {
        console.warn('[TestUtils] Cleanup error:', error);
      }
    }
  }
}

// ============================================================================
// Test Environment Helpers
// ============================================================================

export function withMockEnv(
  env: Record<string, string>,
  fn: () => void,
): void {
  const original: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    original[key] = process.env[key];
    process.env[key] = value;
  }

  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export async function withMockEnvAsync(
  env: Record<string, string>,
  fn: () => Promise<void>,
): Promise<void> {
  const original: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(env)) {
    original[key] = process.env[key];
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

export function expectValidArticle(article: CrawlerArticle): void {
  expect(article.title).toBeTruthy();
  expect(article.url).toMatch(/^https?:\/\//);
  expect(article.publishedAt).toBeInstanceOf(Date);
  expect(article.language).toMatch(/^(ko|en)$/);
  expect(article.sourceNameEn).toBeTruthy();
}

export function expectValidFetchResult(result: CrawlerFetchResult): void {
  expect(result.fetchedAt).toBeInstanceOf(Date);
  expect(result.sourceNameEn).toBeTruthy();
  expect(Array.isArray(result.articles)).toBe(true);
  expect(result.pagesCrawled).toBeGreaterThanOrEqual(0);

  for (const article of result.articles) {
    expectValidArticle(article);
  }
}
