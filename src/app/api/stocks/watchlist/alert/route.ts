import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('WatchlistAlert')

// Alert threshold: 2% price change triggers alert
const CHANGE_THRESHOLD = 2.0
// How often to check prices (30 seconds)
const CHECK_INTERVAL_MS = 30000

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(new TextEncoder().encode('event: connected\ndata: {"status":"connected"}\n\n'))
        log.info('Client connected to watchlist alert stream')

        const interval = setInterval(async () => {
          if (isClosed) return
          try {
            const alerts = await checkWatchlistAlerts()
            if (alerts.length > 0) {
              controller.enqueue(
                new TextEncoder().encode(`event: alert\ndata: ${JSON.stringify({ alerts })}\n\n`)
              )
              log.info('Watchlist alerts emitted', { count: alerts.length })
            }
          } catch (error) {
            log.error('Watchlist alert check failed:', error)
          }
        }, CHECK_INTERVAL_MS)

        const heartbeat = setInterval(() => {
          if (isClosed) return
          controller.enqueue(new TextEncoder().encode('event: heartbeat\ndata: {}\n\n'))
        }, 15000)

        request.signal?.addEventListener('abort', () => {
          clearInterval(interval)
          clearInterval(heartbeat)
          isClosed = true
          log.info('Client disconnected from watchlist alert stream')
        })
      } catch (error) {
        log.error('Watchlist alert stream setup failed:', error)
        controller.close()
      }
    },
    cancel() {
      isClosed = true
      log.info('Watchlist alert stream cancelled')
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

async function checkWatchlistAlerts() {
  const watchlistItems = await prisma.stockWatchlist.findMany({
    where: { userId: null },
    select: { stockCode: true, stockName: true, id: true },
  })

  if (watchlistItems.length === 0) return []

  const alerts: Array<{
    watchlistId: number
    stockCode: string
    stockName: string
    currentPrice: string
    changeRate: string
    direction: 'up' | 'down' | 'stable'
  }> = []

  for (const item of watchlistItems) {
    try {
      const latestPrice = await prisma.stockPrice.findFirst({
        where: { stock: { code: item.stockCode } },
        orderBy: { timestamp: 'desc' },
        select: { price: true, changeRate: true },
      })

      if (latestPrice) {
        const changeRateNum = Number(latestPrice.changeRate)
        if (Math.abs(changeRateNum) >= CHANGE_THRESHOLD) {
          alerts.push({
            watchlistId: item.id,
            stockCode: item.stockCode,
            stockName: item.stockName,
            currentPrice: latestPrice.price.toString(),
            changeRate: changeRateNum.toFixed(2),
            direction: changeRateNum > 0 ? 'up' : 'down',
          })
        }
      }
    } catch (error) {
      log.error(`Failed to check price for ${item.stockCode}:`, error)
    }
  }

  return alerts
}
