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

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'EconomyNews/1.0 (RSS Aggregator)',
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

function extractThumbnail(item: Record<string, unknown>): string | undefined {
  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined
  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined

  if (mediaContent?.$?.url) return mediaContent.$.url
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url
  return undefined
}

function extractCategory(item: Record<string, unknown>): string | undefined {
  const categories = item.categories
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0]
  }
  if (typeof categories === 'string') {
    return categories
  }
  return undefined
}

export async function fetchFeed(
  source: RSSSourceConfig
): Promise<{ articles: ParsedArticle[]; error?: string }> {
  try {
    const feed = await parser.parseURL(source.url)
    const articles: ParsedArticle[] = []

    for (const item of feed.items) {
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

    return { articles }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { articles: [], error: errorMessage }
  }
}

export async function fetchAllFeeds(
  sources: RSSSourceConfig[]
): Promise<Map<string, { articles: ParsedArticle[]; error?: string }>> {
  const results = new Map<string, { articles: ParsedArticle[]; error?: string }>()

  const fetchPromises = sources.map(async (source) => {
    const result = await fetchFeed(source)
    results.set(source.nameEn, result)
  })

  await Promise.allSettled(fetchPromises)
  return results
}
