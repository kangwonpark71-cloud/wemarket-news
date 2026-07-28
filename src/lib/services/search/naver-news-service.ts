/**
 * Naver News Search API Service
 *
 * Wraps the Naver Open API v1 Search (news.json) endpoint:
 *   https://openapi.naver.com/v1/search/news.json
 *
 * Requires NAVER_CLIENT_ID and NAVER_CLIENT_SECRET env vars.
 * Results are cached via cacheService (60s default TTL).
 */

import { cacheService, CacheTTL } from '@/lib/services/cache/cache-service';

import { createLogger } from '@/lib/logger'
const log = createLogger('NaverNews')

// ── Types ──────────────────────────────────────────────────────

export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NaverNewsResponse {
  items: NaverNewsItem[];
  total: number;
  start: number;
  display: number;
}

export interface SearchOptions {
  /** Number of results per page (10–100, default 10). */
  display?: number;
  /** Start position (1–1000, default 1). */
  start?: number;
  /** Sort: 'sim' (similarity) or 'date' (date). Default 'sim'. */
  sort?: 'sim' | 'date';
}

export interface NormalizedNaverArticle {
  title: string;
  url: string;
  originalUrl: string;
  description: string;
  publishedAt: Date;
  source: string;
}

// ── Cache ──────────────────────────────────────────────────────

const CACHE_PREFIX = 'naver:search';
const DEFAULT_TTL = CacheTTL.MINUTE; // 60s

function cacheKey(query: string, opts: SearchOptions): string {
  return `${CACHE_PREFIX}:${query}:${opts.display ?? 10}:${opts.start ?? 1}:${opts.sort ?? 'sim'}`;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Strip HTML tags from Naver API returned text.
 * Naver wraps query terms in <b> tags for highlighting.
 */
function stripHtml(text: string): string {
  // First, decode common HTML entities
  const entityDecoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // Then strip HTML tags and remaining unknown entities
  return entityDecoded.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, '').trim();
}

/**
 * Normalize a raw NaverNewsItem into our internal shape.
 */
function normalizeItem(item: NaverNewsItem): NormalizedNaverArticle {
  return {
    title: stripHtml(item.title),
    url: item.link,
    originalUrl: item.originallink,
    description: stripHtml(item.description),
    publishedAt: new Date(item.pubDate),
    source: extractSourceDomain(item.originallink || item.link),
  };
}

/**
 * Extract a readable source name from a URL.
 */
function extractSourceDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── API call ───────────────────────────────────────────────────

const NAVER_API_URL = 'https://openapi.naver.com/v1/search/news.json';

/**
 * Search Naver News with the given query and options.
 *
 * Returns cached results if available; otherwise calls the Naver
 * Open API and caches the normalized response for 60 seconds.
 */
export async function searchNaverNews(
  query: string,
  options: SearchOptions = {},
): Promise<{ articles: NormalizedNaverArticle[]; total: number; display: number }> {
  if (!query.trim()) {
    return { articles: [], total: 0, display: 0 };
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    log.warn('[NaverNews] Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET');
    return { articles: [], total: 0, display: 0 };
  }

  const cKey = cacheKey(query, options);
  const cached = await cacheService.get<{ articles: NormalizedNaverArticle[]; total: number; display: number }>(cKey);
  if (cached) return cached;

  const { display = 10, start = 1, sort = 'sim' } = options;
  const params = new URLSearchParams({
    query,
    display: String(Math.min(Math.max(display, 10), 100)),
    start: String(Math.min(Math.max(start, 1), 1000)),
    sort,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${NAVER_API_URL}?${params}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      log.error(`[NaverNews] HTTP ${response.status}: ${errorBody}`);
      return { articles: [], total: 0, display: 0 };
    }

    const data: NaverNewsResponse = await response.json();

    const result = {
      articles: (data.items ?? []).map(normalizeItem),
      total: data.total ?? 0,
      display: data.display ?? 0,
    };

    await cacheService.set(cKey, result, { ttl: DEFAULT_TTL });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`[NaverNews] Request failed: ${message}`);
    return { articles: [], total: 0, display: 0 };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Search Naver News and return articles sorted by date (most recent first).
 */
export async function searchNaverNewsByDate(
  query: string,
  options: Omit<SearchOptions, 'sort'> = {},
): Promise<{ articles: NormalizedNaverArticle[]; total: number; display: number }> {
  return searchNaverNews(query, { ...options, sort: 'date' });
}
