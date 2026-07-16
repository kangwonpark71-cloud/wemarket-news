import { NextResponse } from 'next/server'
import { runRssFetch } from '@/lib/rss/scheduler'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const url = new URL(request.url)
  const sourceParam = url.searchParams.get('source')

  console.log(`[Dev Fetch] Triggering RSS fetch ${sourceParam ? `for source: ${sourceParam}` : 'for all sources'}`)
  const startTime = Date.now()

  const results = await runRssFetch(sourceParam || undefined)

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  console.log(`[Dev Fetch] Completed in ${totalDuration}ms: ${successCount} success, ${errorCount} errors`)

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
}
