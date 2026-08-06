import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiStocksWatchlist')

// GET /api/stocks/watchlist — Returns all watchlisted stocks
export async function GET() {
  try {
    const watchlist = await prisma.stockWatchlist.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: watchlist })
  } catch (error) {
    log.error('Failed to fetch watchlist:', error)
    return apiError('Failed to fetch watchlist', 500)
  }
}

// POST /api/stocks/watchlist — Add stock to watchlist
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const stockCode = body.stockCode || body.code
    const stockName = body.stockName || body.name

    if (!stockCode || !stockName) {
      return apiError('stockCode and stockName are required', 400)
    }

    const existing = await prisma.stockWatchlist.findFirst({
      where: { stockCode, userId: null },
    })

    if (existing) {
      return apiError('Already in watchlist', 409)
    }

    const item = await prisma.stockWatchlist.create({
      data: { stockCode, stockName },
    })

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    log.error('Failed to add to watchlist:', error)
    return apiError('Failed to add to watchlist', 500)
  }
}

// DELETE /api/stocks/watchlist — Remove stock from watchlist
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const stockCode = body.stockCode || body.code

    if (!stockCode) {
      return apiError('stockCode is required', 400)
    }

    await prisma.stockWatchlist.deleteMany({
      where: { stockCode, userId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to remove from watchlist:', error)
    return apiError('Failed to remove from watchlist', 500)
  }
}
