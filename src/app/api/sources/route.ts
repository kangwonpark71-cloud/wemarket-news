import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAllActiveSources } from '@/lib/rss/service'

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
    console.error('Failed to fetch sources:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
