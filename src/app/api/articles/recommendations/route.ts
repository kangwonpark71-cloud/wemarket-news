import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticlesRecommendations')

export async function GET() {
  try {
    const bookmarks = await prisma.article.findMany({
      where: { isBookmarked: true },
      take: 20,
      select: {
        category: true,
        sourceId: true,
      },
    })

    if (bookmarks.length === 0) {
      const latestArticles = await prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 10,
        include: { source: true },
      })
      return NextResponse.json({
        success: true,
        recommendations: latestArticles,
        basedOn: 'latest',
      })
    }

    const categoryCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}

    for (const b of bookmarks) {
      if (b.category) {
        categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1
      }
      if (b.sourceId) {
        sourceCounts[b.sourceId] = (sourceCounts[b.sourceId] || 0) + 1
      }
    }

    const topCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])
    const topSources = Object.keys(sourceCounts).sort((a, b) => sourceCounts[b] - sourceCounts[a])

    const recommendations = await prisma.article.findMany({
      where: {
        isBookmarked: false,
        OR: [
          { category: { in: topCategories.slice(0, 3) } },
          { sourceId: { in: topSources.slice(0, 3) } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      include: { source: true },
    })

    return NextResponse.json({
      success: true,
      recommendations,
      basedOn: {
        categories: topCategories.slice(0, 3),
        sourcesCount: topSources.length,
      },
    })
  } catch (error) {
    log.error('Failed to generate article recommendations:', error)
    return apiError('Failed to generate recommendations', 500)
  }
}