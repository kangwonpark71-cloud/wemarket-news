import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFetchlogs')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const sourceId = searchParams.get('sourceId') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const status = searchParams.get('status') || undefined

  try {
    const where: Record<string, unknown> = {}
    if (sourceId) where.sourceId = sourceId
    if (status) where.status = status

    const [logs, total] = await Promise.all([
      prisma.fetchLog.findMany({
        where,
        include: { source: { select: { name: true, nameEn: true, category: true } } },
        orderBy: { fetchedAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
      }),
      prisma.fetchLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    log.error('Failed to fetch logs:', error)
    return apiError('Failed to fetch logs', 500)
  }
}