import prisma from '@/lib/db'
import { ParsedArticle } from './fetcher'
import { Prisma } from '@prisma/client'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const articleWithSummary = Prisma.validator<Prisma.ArticleDefaultArgs>()({
  include: { source: true, summary: true },
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const articleWithSource = Prisma.validator<Prisma.ArticleDefaultArgs>()({
  include: { source: true },
})

export type ArticleWithSource = Prisma.ArticleGetPayload<typeof articleWithSummary>
export type ArticleWithSourceOnly = Prisma.ArticleGetPayload<typeof articleWithSource>

const TRANSLATION_QUEUE_MAX = 5000
const englishArticleIds: string[] = []

export function scheduleTranslation(articleId: string) {
  if (englishArticleIds.length >= TRANSLATION_QUEUE_MAX) {
    if (englishArticleIds.length === TRANSLATION_QUEUE_MAX) {
      console.warn(`[RSS DB] Translation queue at max (${TRANSLATION_QUEUE_MAX}), dropping oldest`)
    }
    englishArticleIds.shift()
  }
  englishArticleIds.push(articleId)
}

export async function processPendingTranslations() {
  if (englishArticleIds.length === 0) return

  const ids = englishArticleIds.splice(0, englishArticleIds.length)
  try {
    const { translateArticleBatch } = await import('@/lib/ai/translation-service')
    const result = await translateArticleBatch(ids)
    if (result.translated > 0) {
      console.log(`[RSS DB] Auto-translated ${result.translated} English articles`)
    }
  } catch (err) {
    console.warn('[RSS DB] Batch translation failed:', err)
  }
}

export async function upsertArticles(
  sourceId: string,
  articles: ParsedArticle[]
): Promise<{ newCount: number; totalCount: number }> {
  let newCount = 0

  for (const article of articles) {
    try {
      const existing = await prisma.article.findUnique({
        where: { url: article.url },
      })

      if (!existing) {
        const created = await prisma.article.create({
          data: {
            sourceId,
            guid: article.guid,
            title: article.title,
            url: article.url,
            description: article.description,
            author: article.author,
            thumbnail: article.thumbnail,
            publishedAt: article.publishedAt,
            category: article.category,
            language: article.language,
          },
          include: { source: true },
        })
        newCount++
        const { sendNotificationWebhook } = await import('@/lib/utils');
        await sendNotificationWebhook(created.title, created.url, created.source.name, created.description || undefined);

        if (article.language === 'en') {
          scheduleTranslation(created.id)
        }
      }
    } catch (err) {
      console.warn(`[RSS DB] Skipping article "${article.title?.substring(0, 50)}":`, err instanceof Error ? err.message : err)
    }
  }

  return { newCount, totalCount: articles.length }
}

export async function getArticles(params: {
  category?: string
  subcategory?: string
  sourceName?: string
  language?: string
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  excludeSourceIds?: string[]
  isBookmarked?: boolean
  isRead?: boolean
}): Promise<{ articles: ArticleWithSource[]; total: number; page: number; totalPages: number }> {
  const {
    category,
    subcategory,
    sourceName,
    language,
    page = 1,
    limit = 20,
    search,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    excludeSourceIds,
    isBookmarked,
    isRead,
  } = params

  const where: Prisma.ArticleWhereInput = {}

  if (excludeSourceIds && excludeSourceIds.length > 0) {
    where.sourceId = { notIn: excludeSourceIds };
  }

  if (typeof isBookmarked === 'boolean') {
    where.isBookmarked = isBookmarked
  }
  if (typeof isRead === 'boolean') {
    where.isRead = isRead
  }

  const sourceFilter: Prisma.SourceWhereInput = {}
  if (category && category !== 'all') {
    sourceFilter.category = category
  }
  if (subcategory) {
    sourceFilter.subcategory = subcategory
  }
  if (sourceName) {
    sourceFilter.nameEn = sourceName
  }
  if (Object.keys(sourceFilter).length > 0) {
    where.source = sourceFilter
  }

  if (language) {
    where.language = language
  }

  if (search) {
    const searchLower = search.toLowerCase()
    where.OR = [
      { title: { contains: searchLower } },
      { description: { contains: searchLower } },
    ]
  }

  const allowedSortFields = ['publishedAt', 'fetchedAt', 'title', 'createdAt']
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'publishedAt'

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { source: true, summary: true },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])

  return {
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getArticleById(id: string): Promise<ArticleWithSource | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { source: true, summary: true },
  })
  return article
}

export async function getRelatedArticles(
  id: string,
  limit = 4,
): Promise<ArticleWithSourceOnly[]> {
  const current = await prisma.article.findUnique({
    where: { id },
    select: { category: true, sourceId: true },
  })
  if (!current) return []

  const candidates = await prisma.article.findMany({
    where: {
      id: { not: id },
      isBookmarked: false,
      OR: [
        { sourceId: current.sourceId },
        ...(current.category ? [{ category: current.category }] : []),
      ],
    },
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit * 2,
  })

  // Prefer same-source matches first, then fill with same-category.
  const sameSource = candidates.filter((a) => a.sourceId === current.sourceId)
  const sameCategory = candidates.filter(
    (a) => a.sourceId !== current.sourceId && a.category === current.category,
  )

  const ranked = [...sameSource, ...sameCategory].slice(0, limit)
  if (ranked.length >= limit) return ranked

  // Fallback: most recent articles so the section is never empty.
  const fallback = await prisma.article.findMany({
    where: { id: { not: id }, isBookmarked: false },
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  const seen = new Set(ranked.map((a) => a.id))
  return [...ranked, ...fallback.filter((a) => !seen.has(a.id))].slice(0, limit)
}

export async function saveArticleContent(id: string, content: string): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { content },
  })
}

export async function markAsRead(id: string): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { isRead: true },
  })
}

export async function toggleBookmark(id: string): Promise<boolean> {
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) throw new Error('Article not found')

  const updated = await prisma.article.update({
    where: { id },
    data: { isBookmarked: !article.isBookmarked },
  })

  return updated.isBookmarked
}

export async function getRecentArticlesBySource(sourceNameEn: string, limit = 10): Promise<ArticleWithSourceOnly[]> {
  const articles = await prisma.article.findMany({
    where: {
      source: { nameEn: sourceNameEn },
    },
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  return articles
}

export async function getArticleStats() {
  const [totalArticles, totalSources, lastFetch] = await Promise.all([
    prisma.article.count(),
    prisma.source.count({ where: { isActive: true } }),
    prisma.fetchLog.findFirst({
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    }),
  ])

  const articlesByCategory = await prisma.article.groupBy({
    by: ['sourceId'],
    _count: true,
    orderBy: { _count: { sourceId: 'desc' } },
    take: 10,
  })

  return {
    totalArticles,
    totalSources,
    lastFetchAt: lastFetch?.fetchedAt || null,
    topSources: articlesByCategory,
  }
}
