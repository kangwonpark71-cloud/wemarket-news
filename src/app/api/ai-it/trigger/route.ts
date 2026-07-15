import { NextResponse } from 'next/server'
import { seedAIITSources } from '@/lib/ai-it/db-service'
import { fetchAllAIITNews } from '@/lib/ai-it/scheduler-service'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const results: Record<string, unknown> = {}

  const seeded = await seedAIITSources()
  results.seeded = seeded

  const fetch = await fetchAllAIITNews()
  results.fetch = fetch

  results.duration = Date.now() - startTime

  return NextResponse.json({ success: true, ...results })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to trigger AI/IT seed + fetch',
    usage: 'POST /api/ai-it/trigger',
  })
}
