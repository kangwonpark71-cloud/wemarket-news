import { NextResponse } from 'next/server';
import { koreaInvestmentService } from '@/lib/services/financial/financial-service';
import { upbitService } from '@/lib/services/crypto/crypto-service';
import { marketService } from '@/lib/services/market/market-service';
import { cacheService, CacheKeys } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

export async function GET() {
  const cacheKey = CacheKeys.financialDashboard();
  const cached = await cacheService.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached });

  try {
    const [stockPrices, , forexRates, globalIndices] = await Promise.all([
      koreaInvestmentService.getMarketOverview().catch(err => {
        console.warn('[Dashboard] KOSPI/KOSDAQ overview failed:', err);
        return { kospi: { value: 0, change: 0, changeRate: 0 }, kosdaq: { value: 0, change: 0, changeRate: 0 } };
      }),
      upbitService.getAllTickers().catch(err => {
        console.warn('[Dashboard] Upbit tickers failed:', err);
        return [];
      }),
      marketService.getAllExchangeRates().catch(err => {
        console.warn('[Dashboard] Forex rates failed:', err);
        return [];
      }),
      marketService.getGlobalIndices().catch(err => {
        console.warn('[Dashboard] Global indices failed:', err);
        return [];
      }),
    ]);

    // Get latest tickers from DB for volume
    const [btcTicker, ethTicker] = await Promise.all([
      prisma.cryptoTicker.findFirst({
        where: { crypto: { symbol: 'BTC' } },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.cryptoTicker.findFirst({
        where: { crypto: { symbol: 'ETH' } },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const dashboard = {
      kospi: stockPrices.kospi,
      kosdaq: stockPrices.kosdaq,
      btc: btcTicker
        ? {
            price: btcTicker.tradePrice,
            change: btcTicker.signedChangePrice,
            changeRate: btcTicker.signedChangeRate,
          }
        : null,
      eth: ethTicker
        ? {
            price: ethTicker.tradePrice,
            change: ethTicker.signedChangePrice,
            changeRate: ethTicker.signedChangeRate,
          }
        : null,
      usdKrw: forexRates.find(r => r.baseCurrency === 'USD') || null,
      nasdaq: globalIndices.find(i => i.symbol === '^IXIC') || null,
      lastUpdated: new Date().toISOString(),
    };

    await cacheService.set(CacheKeys.financialDashboard(), dashboard, { ttl: 60 });

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('[API] Dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
