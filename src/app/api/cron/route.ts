import { NextResponse } from 'next/server'
import { runRssFetch } from '@/lib/rss/scheduler'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sourceParam = url.searchParams.get('source')

  const startTime = Date.now()

  const results = await runRssFetch(sourceParam || undefined)

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length
  const partialCount = results.filter(r => r.status === 'partial').length


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
    usage: 'POST /api/cron?source=hankyung (optional)',
  })
}
