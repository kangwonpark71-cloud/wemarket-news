import Parser from 'rss-parser'
import { RSSSourceConfig } from './sources'

export interface ParsedArticle {
  guid?: string
  title: string
  url: string
  description?: string
  author?: string
  thumbnail?: string
  publishedAt: Date
  category?: string
  language: 'ko' | 'en'
}

export interface FetchResult {
  articles: ParsedArticle[]
  error?: string
  fetchedAt: Date
  sourceName: string
}

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'EconomyNews/1.0 (RSS Aggregator; +https://economy-news.example.com)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['category', 'categories'],
    ],
  },
})

export function extractThumbnail(item: Record<string, unknown>): string | undefined {
  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined
  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined

  if (mediaContent?.$?.url) return mediaContent.$.url
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url
  return undefined
}

export function extractCategory(item: Record<string, unknown>): string | undefined {
  const categories = item.categories
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0]
  }
  if (typeof categories === 'string') {
    return categories
  }
  return undefined
}

async function fetchWithRetry(
  url: string,
  retries: number = 3,
  baseDelay: number = 1000
): Promise<{ feed: Parser.Output<unknown> } | null> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const feed = await parser.parseURL(url)
      return { feed }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        console.warn(`[RSS Fetcher] Attempt ${attempt + 1} failed for ${url}: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`[RSS Fetcher] All ${retries + 1} attempts failed for ${url}: ${lastError?.message}`)
  return null
}

export async function fetchFeed(
  source: RSSSourceConfig
): Promise<FetchResult> {
  const startTime = Date.now()

  try {
    const result = await fetchWithRetry(source.url, 3, 2000)

    if (!result) {
      return {
        articles: [],
        error: `Failed after retries: ${source.url}`,
        fetchedAt: new Date(),
        sourceName: source.nameEn,
      }
    }

    const articles: ParsedArticle[] = []

    for (const item of result.feed.items) {
      const title = item.title?.trim()
      const link = item.link?.trim()

      if (!title || !link) continue

      const itemData = item as unknown as Record<string, unknown>

      let publishedAt: Date
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate)
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate)
      } else {
        publishedAt = new Date()
      }

      if (isNaN(publishedAt.getTime())) {
        publishedAt = new Date()
      }

      articles.push({
        guid: item.guid || item.link,
        title,
        url: link,
        description: item.contentSnippet?.substring(0, 500) || item.content?.substring(0, 500),
        author: item.creator || (itemData.author as string) || source.name,
        thumbnail: extractThumbnail(itemData),
        publishedAt,
        category: extractCategory(itemData) || source.subcategory,
        language: source.language,
      })
    }

    const duration = Date.now() - startTime
    console.log(`[RSS Fetcher] Successfully fetched ${articles.length} articles from ${source.name} (${source.nameEn}) in ${duration}ms`)

    return {
      articles,
      fetchedAt: new Date(),
      sourceName: source.nameEn,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[RSS Fetcher] Error fetching ${source.name} (${source.nameEn}) after ${duration}ms: ${errorMessage}`)

    return {
      articles: [],
      error: errorMessage,
      fetchedAt: new Date(),
      sourceName: source.nameEn,
    }
  }
}

export async function fetchAllFeeds(
  sources: RSSSourceConfig[]
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>()

  const fetchPromises = sources.map(async (source) => {
    const result = await fetchFeed(source)
    results.set(source.nameEn, result)
  })

  await Promise.allSettled(fetchPromises)
  return results
}