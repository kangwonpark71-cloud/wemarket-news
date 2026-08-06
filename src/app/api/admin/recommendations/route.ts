import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
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
    return apiError('Unauthorized', 401)
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
        return apiError('articleId query parameter is required', 400)
      }
      const limit = Math.min(Number(searchParams.get('limit')) || 6, 20)
      const result = await getRecommendations(articleId, limit)
      if (!result) {
        return apiError('Article not found', 404)
      }
      return NextResponse.json({ success: true, data: result })
    }

    return apiError(`Unknown mode: ${mode}. Available: keyword-stats, trending, recommend`, 400)
  } catch (error) {
    log.error('Recommendation API error:', error)
    return apiError('Failed to process recommendation request', 500)
  }
}
