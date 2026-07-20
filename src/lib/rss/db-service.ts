import prisma from '@/lib/db'
import { ParsedArticle } from './fetcher'
import { Prisma, Article, Source } from '@prisma/client'

export type ArticleWithSource = Article & { source: Source }

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
      }
    } catch (err) {
      console.warn(`[RSS DB] Skipping article "${article.title?.substring(0, 50)}":`, err instanceof Error ? err.message : err)
    }
  }

  return { newCount, totalCount: articles.length }
}

export async function getArticles(params: {
  category?: string
  sourceName?: string
  language?: string
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  excludeSourceIds?: string[]
}): Promise<{ articles: ArticleWithSource[]; total: number; page: number; totalPages: number }> {
  const {
    category,
    sourceName,
    language,
    page = 1,
    limit = 20,
    search,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    excludeSourceIds,
  } = params

  const where: Prisma.ArticleWhereInput = {}

  if (excludeSourceIds && excludeSourceIds.length > 0) {
    where.sourceId = { notIn: excludeSourceIds };
  }

  const sourceFilter: Prisma.SourceWhereInput = {}
  if (category && category !== 'all') {
    sourceFilter.category = category
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
      include: { source: true },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ])

  return {
    articles: articles as ArticleWithSource[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getArticleById(id: string): Promise<ArticleWithSource | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { source: true },
  })
  return article as ArticleWithSource | null
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

export async function getRecentArticlesBySource(sourceNameEn: string, limit = 10): Promise<ArticleWithSource[]> {
  const articles = await prisma.article.findMany({
    where: {
      source: { nameEn: sourceNameEn },
    },
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
  return articles as ArticleWithSource[]
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
