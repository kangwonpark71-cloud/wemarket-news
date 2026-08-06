import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { seedAIITSources } from '@/lib/ai-it/db-service'
import { fetchAllAIITNews } from '@/lib/ai-it/scheduler-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitTrigger')

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === 'production' && !cronSecret) {
    return apiError('Server misconfigured', 500)
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiError('Unauthorized', 401)
  }

  try {
    const startTime = Date.now()
    const results: Record<string, unknown> = {}

    const seeded = await seedAIITSources()
    results.seeded = seeded

    const fetch = await fetchAllAIITNews()
    results.fetch = fetch

    results.duration = Date.now() - startTime

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    log.error('AI/IT trigger failed:', error)
    return apiError('AI/IT trigger failed', 500)
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to trigger AI/IT seed + fetch',
    usage: 'POST /api/ai-it/trigger',
  })
}
