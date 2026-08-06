import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { prisma } from '@/lib/db'
import { sanitizeAdHtml } from '@/lib/utils/sanitize'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAds')

export async function GET() {
  try {
    const now = new Date()

    const ads = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: null },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        adType: true,
        content: true,
        linkUrl: true,
        position: true,
      },
    })

    const safeAds = ads.map((ad) =>
      ad.adType === 'html' ? { ...ad, content: sanitizeAdHtml(ad.content) } : ad,
    )

    return NextResponse.json({ success: true, ads: safeAds })
  } catch (error) {
    log.error('Failed to fetch ads:', error)
    return apiError('Failed to fetch ads', 500)
  }
}
