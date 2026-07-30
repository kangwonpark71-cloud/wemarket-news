/**
 * AI Recommendation Engine
 * Suggests related articles based on keyword overlap, category, and tags.
 * Uses content-based filtering (no external AI API calls for recommendations).
 */

import prisma from '@/lib/db'

export interface RecommendedArticle {
  id: string
  title: string
  url: string
  description: string | null
  thumbnail: string | null
  publishedAt: Date
  source: { name: string; nameEn: string } | null
  relevanceScore: number
}

export interface RecommendationResponse {
  articleId: string
  articleTitle: string
  recommendations: RecommendedArticle[]
  totalCandidates: number
}

/**
 * Get related articles for a given article based on:
 * 1. Same category articles with overlapping keywords (highest score)
 * 2. Same source-type articles in same category
 * 3. Articles from any source with keyword overlap
 *
 * @param articleId - Source article ID
 * @param limit - Max recommendations to return (default 6)
 * @param maxDaysBack - Max age of recommended articles in days (default 30)
 */
export async function getRecommendations(
  articleId: string,
  limit: number = 6,
  maxDaysBack: number = 30,
): Promise<RecommendationResponse | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      source: { select: { name: true, nameEn: true } },
      tags: {
        include: { tag: true },
      },
      summary: { select: { keywords: true } },
    },
  })

  if (!article) return null

  const since = new Date(Date.now() - maxDaysBack * 24 * 60 * 60 * 1000)
  const articleKeywords = new Set(
    article.keywords
      ? article.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [],
  )

  // Also include summary keywords
  if (article.summary?.keywords) {
    for (const kw of article.summary.keywords) {
      articleKeywords.add(kw.toLowerCase())
    }
  }

  const tagIds = article.tags.map((t) => t.tagId)

  // Strategy 1: same category, different article, with keyword overlap
  const sameCategoryWithKeywords = article.category
    ? await prisma.article.findMany({
        where: {
          id: { not: articleId },
          category: article.category,
          publishedAt: { gte: since },
          OR: articleKeywords.size > 0
            ? Array.from(articleKeywords).map((kw) => ({
                keywords: { contains: kw },
              }))
            : undefined,
        },
        include: {
          source: { select: { name: true, nameEn: true } },
        },
        take: limit * 2,
        orderBy: { publishedAt: 'desc' },
      })
    : []

  // Strategy 2: same tags
  const taggedArticles = tagIds.length > 0
    ? await prisma.newsTagRelation.findMany({
        where: {
          tagId: { in: tagIds },
          article: {
            id: { not: articleId },
            publishedAt: { gte: since },
          },
        },
        include: {
          article: {
            include: {
              source: { select: { name: true, nameEn: true } },
              tags: { select: { tagId: true } },
            },
          },
        },
        take: limit * 2,
        orderBy: { article: { publishedAt: 'desc' } },
      })
    : []

  // Strategy 3: same sourceType + category
  const sameSourceFallback = !article.category && article.source
    ? await prisma.article.findMany({
        where: {
          id: { not: articleId },
          sourceType: article.sourceType,
          publishedAt: { gte: since },
        },
        include: {
          source: { select: { name: true, nameEn: true } },
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
      })
    : []

  // Score and deduplicate
  const seen = new Set<string>()
  const scored: RecommendedArticle[] = []

  const addIfNew = (
    a: typeof sameCategoryWithKeywords[0],
    score: number,
  ) => {
    if (seen.has(a.id)) return
    seen.add(a.id)
    scored.push({
      id: a.id,
      title: a.title,
      url: a.url,
      description: a.description,
      thumbnail: a.thumbnail,
      publishedAt: a.publishedAt,
      source: a.source,
      relevanceScore: score,
    })
  }

  // Score: keyword match count in same category
  for (const a of sameCategoryWithKeywords) {
    const aKws = new Set(
      a.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    )
    let overlap = 0
    for (const kw of articleKeywords) {
      if (aKws.has(kw)) overlap++
    }
    const score = 100 + overlap * 20
    addIfNew(a, score)
  }

  // Score: shared tags
  for (const rel of taggedArticles) {
    const sharedTags = rel.article.tags?.filter((t) => tagIds.includes(t.tagId)).length ?? 0
    const score = 80 + sharedTags * 15
    addIfNew(rel.article, score)
  }

  // Score: fallback
  for (const a of sameSourceFallback) {
    const score = 50
    addIfNew(a, score)
  }

  // Sort by score desc, then by publishedAt desc, take limit
  scored.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
    return b.publishedAt.getTime() - a.publishedAt.getTime()
  })

  return {
    articleId,
    articleTitle: article.title,
    recommendations: scored.slice(0, limit),
    totalCandidates: scored.length,
  }
}

/**
 * Get trending articles based on view count and recency (for homepage/widget).
 */
export async function getTrendingArticles(
  limit: number = 10,
  daysBack: number = 7,
  minViews: number = 5,
) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  const articles = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
      viewCount: { gte: minViews },
    },
    include: {
      source: { select: { name: true } },
    },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  })

  return articles
}

/**
 * Get keyword co-occurrence stats for admin.
 */
export async function getKeywordStats(limit: number = 50) {
  const articles = await prisma.article.findMany({
    select: { keywords: true },
    where: { keywords: { not: '' } },
    take: 2000,
  })

  const freq = new Map<string, number>()
  for (const article of articles) {
    const kws = article.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    for (const kw of kws) {
      freq.set(kw, (freq.get(kw) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword, count]) => ({ keyword, count }))
}
