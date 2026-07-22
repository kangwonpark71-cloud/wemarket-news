import { NextResponse } from 'next/server'
import { runRssFetch } from '@/lib/rss/scheduler'

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not available in production' }, { status: 404 })
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
    console.error('Dev fetch failed:', error)
    return NextResponse.json(
      { success: false, error: 'Dev fetch failed' },
      { status: 500 }
    )
  }
}
