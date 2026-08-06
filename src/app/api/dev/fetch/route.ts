import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { runRssFetch } from '@/lib/rss/scheduler'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiDevFetch')

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return apiError('Not available in production', 404)
  }

  try {
    const url = new URL(request.url)
    const sourceParam = url.searchParams.get('source')

    const startTime = Date.now()

    const results = await runRssFetch(sourceParam || undefined)

    const totalDuration = Date.now() - startTime
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      environment: 'development',
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
      results,
    })
  } catch (error) {
    log.error('Dev fetch failed:', error)
    return apiError('Dev fetch failed', 500)
  }
}
