import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiStocksWatchlistToggle')

// POST /api/stocks/watchlist/toggle — Toggle watchlist status
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
      await prisma.stockWatchlist.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, data: { watchlisted: false } })
    } else {
      await prisma.stockWatchlist.create({
        data: { stockCode, stockName },
      })
      return NextResponse.json({ success: true, data: { watchlisted: true } })
    }
  } catch (error) {
    log.error('Failed to toggle watchlist:', error)
    return apiError('Failed to toggle watchlist', 500)
  }
}
