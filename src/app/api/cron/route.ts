import { NextResponse } from 'next/server'
import { fetchFeed } from '@/lib/rss/fetcher'
import { upsertArticles } from '@/lib/rss/db-service'
import { getSourceIdByNameEn, logFetch, seedSources } from '@/lib/rss/service'
import { ALL_SOURCES } from '@/lib/rss/sources'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sourceParam = url.searchParams.get('source')
  const forceFetch = url.searchParams.get('force') === 'true'

  const sourcesToFetch = sourceParam
    ? ALL_SOURCES.filter((s) => s.nameEn === sourceParam)
    : ALL_SOURCES

  // Auto-seed sources on first run (fresh deployment)
  const anySource = sourcesToFetch.length > 0 ? await getSourceIdByNameEn(sourcesToFetch[0].nameEn) : null
  if (!anySource) {
    console.log('[Cron] No sources found in DB, seeding...')
    await seedSources()
  }

  const startTime = Date.now()
  const results = []

  console.log(`[Cron] Starting RSS fetch for ${sourcesToFetch.length} sources (force: ${forceFetch})`)

  for (const sourceConfig of sourcesToFetch) {
    const sourceStartTime = Date.now()

    try {
      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (!sourceId) {
        results.push({ source: sourceConfig.nameEn, status: 'skipped', error: 'Source not found in DB' })
        continue
      }

      const { articles, error, fetchedAt } = await fetchFeed(sourceConfig)
      const duration = Date.now() - sourceStartTime

      if (error) {
        await logFetch(sourceId, 'error', 0, 0, duration, error)
        console.warn(`[Cron] ${sourceConfig.nameEn}: ${error}`)
        results.push({ source: sourceConfig.nameEn, status: 'error', error, duration })
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
        fetchedAt: fetchedAt.toISOString(),
      })

      console.log(`[Cron] ${sourceConfig.nameEn}: ${status} - ${totalCount} total, ${newCount} new (${duration}ms)`)
    } catch (err) {
      const duration = Date.now() - sourceStartTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (sourceId) {
        await logFetch(sourceId, 'error', 0, 0, duration, errorMessage)
      }

      console.error(`[Cron] ${sourceConfig.nameEn}: Exception - ${errorMessage}`)
      results.push({ source: sourceConfig.nameEn, status: 'error', error: errorMessage, duration })
    }
  }

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const partialCount = results.filter(r => r.status === 'partial').length

  console.log(`[Cron] Completed in ${totalDuration}ms: ${successCount} success, ${partialCount} partial, ${errorCount} errors`)

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    summary: {
      total: results.length,
      success: successCount,
      partial: partialCount,
      errors: errorCount,
    },
    results,
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger RSS fetch',
    timestamp: new Date().toISOString(),
    usage: 'POST /api/cron?source=hankyung (optional) & force=true (optional)',
  })
}
