import { NextResponse } from 'next/server';
import { koreaInvestmentService } from '@/lib/services/financial/financial-service';
import { upbitService } from '@/lib/services/crypto/crypto-service';
import { marketService } from '@/lib/services/market/market-service';
import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [marketOverview, cryptoTickers, forexRates, globalIndices] = await Promise.all([
      koreaInvestmentService.getMarketOverview(),
      upbitService.getAllTickers(),
      marketService.getAllExchangeRates(),
      marketService.getGlobalIndices(),
    ]);

    // Get stats from DB
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

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    console.error('[API] Overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}
