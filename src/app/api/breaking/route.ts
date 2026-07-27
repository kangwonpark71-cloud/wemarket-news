import { NextResponse } from 'next/server'
import { getBreakingArticles } from '@/lib/rss/db-service'
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    const cacheKey = CacheKeys.articles({ breaking: '1', page: String(page), limit: String(Math.min(limit, 100)) })
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      return NextResponse.json({ success: true, data: cached })
    }

    const result = await getBreakingArticles(Math.min(limit, 100), page)

    await cacheService.set(cacheKey, result, { ttl: CacheTTL.MINUTE_5 })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch breaking articles:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch breaking articles' },
      { status: 500 }
    )
  }
}
