import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cacheService, CacheKeys } from '@/lib/services/cache/cache-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'STOCK';
  const timeframe = searchParams.get('timeframe') || '1d';
  const limit = parseInt(searchParams.get('limit') || '200');

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Symbol is required' },
      { status: 400 }
    );
  }

  try {
    const cacheKey = CacheKeys.chartData(symbol, type, timeframe);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    type CandleData = { timestamp: Date; open: number; high: number; low: number; close: number; volume: number };
    type RateData = { timestamp: Date; close: number };
    let result: (CandleData | RateData)[] = [];

    switch (type) {
      case 'STOCK': {
        const stock = await prisma.stock.findUnique({
          where: { code: symbol },
          select: { id: true },
        });

        if (!stock) {
          return NextResponse.json(
            { success: false, error: 'Stock not found' },
            { status: 404 }
          );
        }

        const prices = await prisma.stockPrice.findMany({
          where: { stockId: stock.id },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        result = prices.map((p) => ({
          timestamp: p.timestamp,
          open: Number(p.openPrice),
          high: Number(p.highPrice),
          low: Number(p.lowPrice),
          close: Number(p.price),
          volume: Number(p.volume),
        })).reverse();
        break;
      }

      case 'CRYPTO': {
        const crypto = await prisma.cryptocurrency.findUnique({
          where: { symbol: symbol.toUpperCase() },
          select: { id: true },
        });

        if (!crypto) {
          return NextResponse.json(
            { success: false, error: 'Cryptocurrency not found' },
            { status: 400 }
          );
        }

        const candles = await prisma.cryptoCandle.findMany({
          where: {
            cryptoId: crypto.id,
            unit: 'days',
          },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        result = candles.map((c) => ({
          timestamp: c.timestamp,
          open: Number(c.openPrice),
          high: Number(c.highPrice),
          low: Number(c.lowPrice),
          close: Number(c.tradePrice),
          volume: Number(c.candleAccTradeVolume),
        })).reverse();
        break;
      }

      case 'INDEX': {
        const index = await prisma.globalIndex.findUnique({
          where: { symbol },
          select: { id: true },
        });

        if (!index) {
          return NextResponse.json(
            { success: false, error: 'Index not found' },
            { status: 404 }
          );
        }

        const quotes = await prisma.globalIndexQuote.findMany({
          where: { indexId: index.id },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        result = quotes.map((q) => ({
          timestamp: q.timestamp,
          open: Number(q.openPrice),
          high: Number(q.highPrice),
          low: Number(q.lowPrice),
          close: Number(q.price),
          volume: Number(q.volume || 0),
        })).reverse();
        break;
      }

      case 'FOREX': {
        const rates = await prisma.exchangeRate.findMany({
          where: {
            baseCurrency: symbol.split('/')[0],
            quoteCurrency: symbol.split('/')[1],
          },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        result = rates.map((r) => ({
          timestamp: r.timestamp,
          close: Number(r.rate),
        })).reverse();
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type' },
          { status: 400 }
        );
    }

    await cacheService.set(`chart:${type}:${symbol}:${timeframe}`, result, {
      ttl: 300,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] Chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}