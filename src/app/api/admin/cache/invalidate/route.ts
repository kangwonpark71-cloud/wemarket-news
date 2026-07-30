import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/utils/auth'
import { cacheService } from '@/lib/services/cache/cache-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminCacheInvalidate')

const CLEARABLE_PATTERNS: Record<string, string> = {
  all: '*',
  financial: 'financial:*',
  articles: 'articles:*',
  'ai-it': 'ai-it:*',
  crypto: 'crypto:*',
  stock: 'stock:*',
  forex: 'forex:*',
  global: 'global:*',
}

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const patternKey: string = body.pattern ?? 'all'

    const pattern = CLEARABLE_PATTERNS[patternKey]
    if (!pattern) {
      return NextResponse.json(
        { success: false, error: `Unknown pattern key: ${patternKey}. Available: ${Object.keys(CLEARABLE_PATTERNS).join(', ')}` },
        { status: 400 },
      )
    }

    await cacheService.deleteByPattern(pattern)
    log.info(`Cache invalidated: ${patternKey} (${pattern})`)

    return NextResponse.json({
      success: true,
      data: {
        pattern: patternKey,
        patternGlob: pattern,
        message: `Cache pattern "${patternKey}" cleared successfully.`,
      },
    })
  } catch (error) {
    log.error('Cache invalidation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate cache' },
      { status: 500 },
    )
  }
}
