import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { runRssFetch } from '@/lib/rss/scheduler'
import { fetchAndProcessSource } from '@/lib/ai-it/scheduler-service'
import { getSessionUser } from '@/lib/utils/auth'

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { sourceId } = body

    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: 'Source ID is required' },
        { status: 400 }
      )
    }

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'Source not found in DB' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { success: false, error: 'Unsupported source type for manual trigger' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Failed to trigger manual fetch:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute manual fetch trigger' },
      { status: 500 }
    )
  }
}