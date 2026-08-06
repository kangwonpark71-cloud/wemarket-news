import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { koreaInvestmentService } from '@/lib/services/financial/financial-service';
import { upbitService } from '@/lib/services/crypto/crypto-service';
import { marketService } from '@/lib/services/market/market-service';
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialOverview')

export async function GET() {
  const cacheKey = CacheKeys.financialDashboard();
  const cached = await cacheService.get(cacheKey);
  if (cached) return NextResponse.json({ success: true, data: cached });

  try {
    const [marketOverview, cryptoTickers, forexRates, globalIndices] = await Promise.all([
      koreaInvestmentService.getMarketOverview().catch(err => {
        log.warn('[Overview] KOSPI/KOSDAQ failed:', err);
        return { kospi: { value: 0, change: 0, changeRate: 0 }, kosdaq: { value: 0, change: 0, changeRate: 0 } };
      }),
      upbitService.getAllTickers().catch(err => {
        log.warn('[Overview] Upbit tickers failed:', err);
        return [];
      }),
      marketService.getAllExchangeRates().catch(err => {
        log.warn('[Overview] Forex rates failed:', err);
        return [];
      }),
      marketService.getGlobalIndices().catch(err => {
        log.warn('[Overview] Global indices failed:', err);
        return [];
      }),
    ]);

    const [totalStocks, totalCryptos, totalArticles] = await Promise.all([
      prisma.stock.count({ where: { isActive: true } }),
      prisma.cryptocurrency.count({ where: { isActive: true } }),
      prisma.article.count(),
    ]);

    const overview = {
      market: {
        kospi: marketOverview.kospi,
        kosdaq: marketOverview.kosdaq,
      },
      crypto: {
        total: cryptoTickers.length,
        topGainers: cryptoTickers.filter(t => t.signedChangeRate > 0).slice(0, 5),
        topLosers: cryptoTickers.filter(t => t.signedChangeRate < 0).slice(0, 5),
        topVolume: cryptoTickers.slice(0, 5),
      },
      forex: {
        usd: forexRates.find(r => r.baseCurrency === 'USD'),
        jpy: forexRates.find(r => r.baseCurrency === 'JPY'),
        eur: forexRates.find(r => r.baseCurrency === 'EUR'),
        cny: forexRates.find(r => r.baseCurrency === 'CNY'),
      },
      global: globalIndices,
      stats: {
        totalStocks,
        totalCryptos,
        totalArticles,
      },
      lastUpdated: new Date().toISOString(),
    };

    await cacheService.set(cacheKey, overview, { ttl: CacheTTL.MINUTE });

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    log.error('[API] Overview error:', error);
    return apiError('Failed to fetch overview', 500);
  }
}
