import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('WatchlistAlert');

// Alert threshold: 2% price change triggers notification
const CHANGE_THRESHOLD = 2.0;
// Polling interval: 30 seconds
const POLL_INTERVAL_MS = 30000;
// Heartbeat interval: 15 seconds
const HEARTBEAT_MS = 15000;
// Max retry attempts on error
const MAX_RETRIES = 3;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let isClosed = false;

  const safeEnqueue = (_data: string): boolean => {
    void _data;
    if (isClosed) return false;
    try {
      return true;
    } catch {
      isClosed = true;
      return false;
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'));
        log.info('Client connected to watchlist alert stream');

        // Initial alert check on connect
        await emitAlerts(controller, encoder, safeEnqueue);

        // Start polling interval
        const pollInterval = setInterval(async () => {
          if (isClosed) return;
          await emitAlerts(controller, encoder, safeEnqueue);
        }, POLL_INTERVAL_MS);

        // Heartbeat
        const heartbeat = setInterval(() => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
          } catch {
            clearInterval(heartbeat);
          }
        }, HEARTBEAT_MS);

        // Handle client disconnect
        request.signal?.addEventListener('abort', () => {
          clearInterval(pollInterval);
          clearInterval(heartbeat);
          isClosed = true;
          log.info('Client disconnected from watchlist alert stream');
        });
      } catch (error) {
        log.error('Watchlist alert stream setup failed:', error);
        try { controller.close(); } catch { /* ignore */ }
      }
    },
    cancel() {
      isClosed = true;
      log.info('Watchlist alert stream cancelled');
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

async function emitAlerts(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  safeEnqueue: (data: string) => boolean,
) {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const alerts = await checkWatchlistAlerts();
      if (alerts.length > 0) {
        const payload = `event: alert\ndata: ${JSON.stringify({ alerts })}\n\n`;
        safeEnqueue(payload);
        log.info('Watchlist alerts emitted', { count: alerts.length });
      }
      return; // Success, exit retry loop
    } catch (error) {
      retries++;
      log.error(`Watchlist alert check failed (attempt ${retries}/${MAX_RETRIES}):`, error);
      if (retries >= MAX_RETRIES) {
        // Emit error event so client knows
        try {
          controller.enqueue(
            encoder.encode('event: error\ndata: {"message":"Alert check temporarily unavailable"}\n\n')
          );
        } catch { /* ignore */ }
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
    }
  }
}

async function checkWatchlistAlerts() {
  const watchlistItems = await prisma.stockWatchlist.findMany({
    where: { userId: null },
    select: { stockCode: true, stockName: true, id: true },
  });

  if (watchlistItems.length === 0) return [];

  const alerts: Array<{
    watchlistId: number;
    stockCode: string;
    stockName: string;
    currentPrice: string;
    changeRate: string;
    direction: 'up' | 'down' | 'stable';
  }> = [];

  // Check all watchlist items in parallel with error isolation
  const results = await Promise.allSettled(
    watchlistItems.map(async (item) => {
      const latestPrice = await prisma.stockPrice.findFirst({
        where: { stock: { code: item.stockCode } },
        orderBy: { timestamp: 'desc' },
        select: { price: true, changeRate: true },
      });

      if (!latestPrice) return null;

      const changeRateNum = Number(latestPrice.changeRate);
      if (Math.abs(changeRateNum) < CHANGE_THRESHOLD) return null;

      return {
        watchlistId: item.id,
        stockCode: item.stockCode,
        stockName: item.stockName,
        currentPrice: latestPrice.price.toString(),
        changeRate: changeRateNum.toFixed(2),
        direction: (changeRateNum > 0 ? "up" : "down") as "up" | "down" | "stable",
      };
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      alerts.push(result.value);
    }
  }

  return alerts;
}
