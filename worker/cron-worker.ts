/**
 * Railway Cron Worker for RSS Collection
 * This script runs as a cron job on Railway, fetches RSS feeds, and exits
 */

import { PrismaClient } from '@prisma/client'
import { ALL_SOURCES } from '../src/lib/rss/sources'

const prisma = new PrismaClient()

interface FetchResult {
  source: string
  status: 'success' | 'partial' | 'error' | 'skipped'
  total?: number
  new?: number
  error?: string
  duration: number
}

interface CronArticle {
  title: string
  url: string
  description: string
  publishedAt: Date
  sourceName: string
  language: string
  category: string
}

const sourceIdCache = new Map<string, string>()

async function getSourceId(sourceName: string): Promise<string | null> {
  if (sourceIdCache.has(sourceName)) return sourceIdCache.get(sourceName)!
  const source = await prisma.source.findFirst({ where: { nameEn: sourceName }, select: { id: true } })
  if (!source) return null
  sourceIdCache.set(sourceName, source.id)
  return source.id
}

async function fetchFeed(source: typeof ALL_SOURCES[0]): Promise<{ articles: CronArticle[]; error?: string }> {
  try {
    const Parser = (await import('rss-parser')).default
    const parser = new Parser()
    
    const feed = await parser.parseURL(source.url)
    const articles = feed.items
      .filter(item => item.title && item.link)
      .map(item => ({
        title: item.title || '',
        url: item.link || '',
        description: item.contentSnippet || item.content || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        sourceName: source.nameEn,
        language: source.language,
        category: source.category,
      }))
    
    return { articles }
  } catch (error) {
    return { articles: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function upsertArticle(article: CronArticle): Promise<boolean> {
  try {
    const existing = await prisma.article.findUnique({
      where: { url: article.url },
    })
    
    if (existing) {
      return false
    }
    
    const sourceId = await getSourceId(article.sourceName)
    if (!sourceId) {
      console.warn(`[CronWorker] Source not found: ${article.sourceName}`)
      return false
    }
    
    await prisma.article.create({
      data: {
        title: article.title,
        url: article.url,
        description: article.description,
        publishedAt: article.publishedAt,
        sourceId,
        language: article.language,
        category: article.category,
        isRead: false,
        isBookmarked: false,
      },
    })
    
    return true
  } catch (error) {
    console.error(`Failed to upsert article: ${article.url}`, error)
    return false
  }
}

async function runCronJob(): Promise<void> {
  const startTime = Date.now()
  console.log(`[CronWorker] Starting RSS fetch at ${new Date().toISOString()}`)
  
  const results: FetchResult[] = []
  
  for (const source of ALL_SOURCES) {
    const sourceStart = Date.now()
    
    try {
      const { articles, error } = await fetchFeed(source)
      
      if (error) {
        results.push({
          source: source.nameEn,
          status: 'error',
          error,
          duration: Date.now() - sourceStart,
        })
        continue
      }
      
      let newCount = 0
      for (const article of articles) {
        const isNew = await upsertArticle(article)
        if (isNew) newCount++
      }
      
      const status = newCount > 0 ? 'success' : 'partial'
      results.push({
        source: source.nameEn,
        status,
        total: articles.length,
        new: newCount,
        duration: Date.now() - sourceStart,
      })
    } catch (err) {
      results.push({
        source: source.nameEn,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - sourceStart,
      })
    }
  }
  
  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'success' || r.status === 'partial').length
  const errorCount = results.filter(r => r.status === 'error').length
  
  console.log(`[CronWorker] Completed in ${totalDuration}ms: ${successCount} success, ${errorCount} errors`)
  
  // Log results for monitoring
  for (const result of results) {
    if (result.status === 'error') {
      console.error(`[CronWorker] ${result.source}: ${result.error}`)
    } else {
      console.log(`[CronWorker] ${result.source}: ${result.new} new articles`)
    }
  }
}

async function main() {
  try {
    await runCronJob()
  } catch (error) {
    console.error('[CronWorker] Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
  
  // Exit cleanly after task completion
  process.exit(0)
}

// Run the cron job
main()
