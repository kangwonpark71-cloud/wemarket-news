import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sanitizeAdHtml } from '@/lib/utils/sanitize'

export async function GET() {
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
}
