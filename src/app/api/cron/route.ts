import { NextResponse } from 'next/server'
import { fetchFeed } from '@/lib/rss/fetcher'
import { upsertArticles } from '@/lib/rss/db-service'
import { getSourceIdByNameEn, logFetch } from '@/lib/rss/service'
import { ALL_SOURCES } from '@/lib/rss/sources'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sourceParam = url.searchParams.get('source')

  const sourcesToFetch = sourceParam
    ? ALL_SOURCES.filter((s) => s.nameEn === sourceParam)
    : ALL_SOURCES

  const results = []

  for (const sourceConfig of sourcesToFetch) {
    const startTime = Date.now()

    try {
      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (!sourceId) {
        results.push({ source: sourceConfig.nameEn, status: 'skipped', error: 'Source not found' })
        continue
      }

      const { articles, error } = await fetchFeed(sourceConfig)
      const duration = Date.now() - startTime

      if (error) {
        await logFetch(sourceId, 'error', 0, 0, duration, error)
        results.push({ source: sourceConfig.nameEn, status: 'error', error })
        continue
      }

      const { newCount, totalCount } = await upsertArticles(sourceId, articles)
      const status = newCount > 0 ? 'success' : 'partial'
      await logFetch(sourceId, status, totalCount, newCount, duration)

      results.push({
        source: sourceConfig.nameEn,
        status,
        total: totalCount,
        new: newCount,
        duration,
      })
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (sourceId) {
        await logFetch(sourceId, 'error', 0, 0, duration, errorMessage)
      }

      results.push({ source: sourceConfig.nameEn, status: 'error', error: errorMessage })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger RSS fetch',
    timestamp: new Date().toISOString(),
  })
}
