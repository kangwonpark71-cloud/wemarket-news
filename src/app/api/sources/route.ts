import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { getAllActiveSources } from '@/lib/rss/service'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiSources')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeLogs = searchParams.get('logs') === 'true'

  try {
    const sources = await getAllActiveSources()

    let logs = null
    if (includeLogs) {
      logs = await prisma.fetchLog.findMany({
        orderBy: { fetchedAt: 'desc' },
        take: 50,
        include: { source: { select: { name: true, nameEn: true } } },
      })
    }

    return NextResponse.json({
      success: true,
      data: sources,
      logs,
    })
  } catch (error) {
    log.error('Failed to fetch sources:', error)
    return apiError('Failed to fetch sources', 500)
  }
}
