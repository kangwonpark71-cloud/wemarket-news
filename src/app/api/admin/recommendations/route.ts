import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/utils/auth'
import {
  getRecommendations,
  getTrendingArticles,
  getKeywordStats,
} from '@/lib/services/recommendation/recommendation-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminRecommendations')

/**
 * GET /api/admin/recommendations?mode=keyword-stats
 * GET /api/admin/recommendations?mode=trending&limit=10
 * GET /api/admin/recommendations?mode=recommend&articleId=xxx&limit=6
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') ?? 'keyword-stats'

    if (mode === 'keyword-stats') {
      const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
      const stats = await getKeywordStats(limit)
      return NextResponse.json({ success: true, data: { stats } })
    }

    if (mode === 'trending') {
      const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
      const articles = await getTrendingArticles(limit)
      return NextResponse.json({ success: true, data: { articles, count: articles.length } })
    }

    if (mode === 'recommend') {
      const articleId = searchParams.get('articleId')
      if (!articleId) {
        return NextResponse.json(
          { success: false, error: 'articleId query parameter is required' },
          { status: 400 },
        )
      }
      const limit = Math.min(Number(searchParams.get('limit')) || 6, 20)
      const result = await getRecommendations(articleId, limit)
      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 },
        )
      }
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json(
      { success: false, error: `Unknown mode: ${mode}. Available: keyword-stats, trending, recommend` },
      { status: 400 },
    )
  } catch (error) {
    log.error('Recommendation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process recommendation request' },
      { status: 500 },
    )
  }
}
