import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiBanners')

export async function GET() {
  try {
    const now = new Date()

    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        position: true,
      },
    })

    return NextResponse.json({ success: true, banners })
  } catch (error) {
    log.error('Failed to fetch banners:', error)
    return apiError('Failed to fetch banners', 500)
  }
}
