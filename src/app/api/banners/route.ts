import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    console.error('Failed to fetch banners:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banners' },
      { status: 500 }
    )
  }
}
