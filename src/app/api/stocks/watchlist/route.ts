import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/stocks/watchlist — Returns all watchlisted stocks
export async function GET() {
  try {
    const watchlist = await prisma.stockWatchlist.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: watchlist })
  } catch (error) {
    console.error('Failed to fetch watchlist:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// POST /api/stocks/watchlist — Add stock to watchlist
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
      return NextResponse.json(
        { success: false, error: 'Already in watchlist' },
        { status: 409 }
      )
    }

    const item = await prisma.stockWatchlist.create({
      data: { stockCode: code, stockName: name },
    })

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Failed to add to watchlist:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/stocks/watchlist — Remove stock from watchlist
export async function DELETE(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 }
      )
    }

    await prisma.stockWatchlist.deleteMany({
      where: { stockCode: code, userId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove from watchlist:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove from watchlist' },
      { status: 500 }
    )
  }
}
