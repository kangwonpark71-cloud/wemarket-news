import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { runRssFetch } from '@/lib/rss/scheduler'
import { fetchAndProcessSource } from '@/lib/ai-it/scheduler-service'
import { getSessionUser } from '@/lib/utils/auth'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminTrigger')

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = await request.json()
    const { sourceId } = body

    if (!sourceId) {
      return apiError('Source ID is required', 400)
    }

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      return apiError('Source not found in DB', 404)
    }

    let result = null

    if (source.sourceType === 'RSS') {
      const results = await runRssFetch(source.nameEn)
      result = results[0] || { status: 'error', error: 'No fetch executed' }
    } else if (source.sourceType === 'AI_IT') {
      const res = await fetchAndProcessSource(source.id)
      result = {
        status: res.error ? 'error' : 'success',
        total: res.count,
        new: res.newCount,
        error: res.error,
      }
    } else {
      return apiError('Unsupported source type for manual trigger', 400)
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    log.error('Failed to trigger manual fetch:', error)
    return apiError('Failed to execute manual fetch trigger', 500)
  }
}