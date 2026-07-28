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
    const body = await request.json()
    const stockCode = body.stockCode || body.code
    const stockName = body.stockName || body.name

    if (!stockCode || !stockName) {
      return NextResponse.json(
        { success: false, error: 'stockCode and stockName are required' },
        { status: 400 }
      )
    }

    const existing = await prisma.stockWatchlist.findFirst({
      where: { stockCode, userId: null },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Already in watchlist' },
        { status: 409 }
      )
    }

    const item = await prisma.stockWatchlist.create({
      data: { stockCode, stockName },
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
    const body = await request.json()
    const stockCode = body.stockCode || body.code

    if (!stockCode) {
      return NextResponse.json(
        { success: false, error: 'stockCode is required' },
        { status: 400 }
      )
    }

    await prisma.stockWatchlist.deleteMany({
      where: { stockCode, userId: null },
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
