import Parser from 'rss-parser';
import { AIITSourceConfig } from './sources';

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

function extractThumbnail(item: Record<string, unknown>): string | undefined {
  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;

  if (mediaContent?.$?.url) return mediaContent.$.url;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;
  return undefined;
}

function extractCategory(item: Record<string, unknown>): string | undefined {
  const categories = item.categories;
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0];
  }
  if (typeof categories === 'string') {
    return categories;
  }
  return undefined;
}

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

async function fetchWithRetry(
  url: string,
  retries: number = 3,
  baseDelay: number = 1000
): Promise<{ feed: Parser.Output<unknown> } | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      return { feed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`[AIIT RSS Fetcher] Attempt ${attempt + 1} failed for ${url}: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`[AIIT RSS Fetcher] All ${retries + 1} attempts failed for ${url}: ${lastError?.message}`);
  return null;
}

export async function fetchAIITFeed(
  source: AIITSourceConfig
): Promise<AIITFetchResult> {
  const startTime = Date.now();

  try {
    if (source.type === 'crawler') {
      return await fetchWithCrawler(source);
    }

    const result = await fetchWithRetry(source.url, 3, 2000);

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

    const duration = Date.now() - startTime;
    console.log(`[AIIT RSS Fetcher] Successfully fetched ${articles.length} articles from ${source.name} (${source.nameEn}) in ${duration}ms`);

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
  // Simple crawler implementation using fetch + DOM parsing
  // For production, consider using puppeteer or playwright
  const { crawlerConfig } = source;
  
  if (!crawlerConfig) {
    return {
      articles: [],
      error: 'No crawler config provided',
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
    };
  }

  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'EconomyNews/1.0 (AI&IT News Crawler)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Simple regex-based extraction (for production, use cheerio or similar)
    const articles: AIITParsedArticle[] = [];
    
    // This is a basic implementation - in production use proper HTML parser
    const titleRegex = new RegExp(`<${crawlerConfig.titleSelector}[^>]*>([^<]+)</${crawlerConfig.titleSelector}>`, 'gi');
    const linkRegex = new RegExp(`<${crawlerConfig.linkSelector}[^>]*href=["']([^"']+)["'][^>]*>`, 'gi');
    
    const titles = [...html.matchAll(titleRegex)].map(m => m[1].trim());
    const links = [...html.matchAll(linkRegex)].map(m => m[1].trim());
    
    for (let i = 0; i < Math.min(titles.length, links.length); i++) {
      const title = titles[i];
      let url = links[i];
      
      if (!url.startsWith('http')) {
        const baseUrl = new URL(source.url);
        url = new URL(url, baseUrl.origin).href;
      }
      
      articles.push({
        guid: url,
        title,
        url,
        description: '',
        publishedAt: new Date(),
        category: source.subcategory,
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      articles: [],
      error: errorMessage,
      fetchedAt: new Date(),
      sourceNameEn: source.nameEn,
    };
  }
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