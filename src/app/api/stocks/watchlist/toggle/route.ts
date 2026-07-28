import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// POST /api/stocks/watchlist/toggle — Toggle watchlist status
export async function POST(request: Request) {
  try {
    const { code, name } = await request.json()

    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'code and name are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.stockWatchlist.findFirst({
      where: { stockCode: code, userId: null },
    })

    if (existing) {
      await prisma.stockWatchlist.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, data: { watchlisted: false } })
    } else {
      await prisma.stockWatchlist.create({
        data: { stockCode: code, stockName: name },
      })
      return NextResponse.json({ success: true, data: { watchlisted: true } })
    }
  } catch (error) {
    console.error('Failed to toggle watchlist:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle watchlist' },
      { status: 500 }
    )
  }
}
