import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { koreaInvestmentService } from '@/lib/services/financial/financial-service';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialStocks')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'prices';
  const code = searchParams.get('code');
  const codes = searchParams.get('codes')?.split(',') || [];
  const market = searchParams.get('market');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    let result: unknown;

    switch (action) {
      case 'price':
        if (!code) {
          return apiError('Code is required', 400);
        }
        result = await koreaInvestmentService.getStockPrice(code);
        break;

      case 'prices':
        if (codes.length === 0) {
          return apiError('Codes are required', 400);
        }
        const priceMap = await koreaInvestmentService.getStockPrices(codes);
        result = Array.from(priceMap.values());
        break;

      case 'detail':
        if (!code) {
          return apiError('Code is required', 400);
        }
        const [detailPrice, masterList] = await Promise.all([
          koreaInvestmentService.getStockPrice(code),
          koreaInvestmentService.getStockMaster(),
        ]);
        const masterInfo = masterList.find((s) => s.code === code) || null;

        let week52: { high: number; highDate: string | null; low: number; lowDate: string | null } | null = null;
        try {
          const stock = await prisma.stock.findUnique({ where: { code }, select: { id: true } });
          if (stock) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const prices = await prisma.stockPrice.findMany({
              where: { stockId: stock.id, timestamp: { gte: oneYearAgo } },
              select: { price: true, timestamp: true },
              orderBy: { timestamp: 'desc' },
            });
            if (prices.length > 0) {
              let high = -Infinity;
              let low = Infinity;
              let highDate: string | null = null;
              let lowDate: string | null = null;
              for (const p of prices) {
                const pNum = Number(p.price);
                if (pNum > high) { high = pNum; highDate = p.timestamp.toISOString(); }
                if (pNum < low) { low = pNum; lowDate = p.timestamp.toISOString(); }
              }
              week52 = { high, highDate, low, lowDate };
            }
          }
        } catch {
          // empty
        }

        result = { price: detailPrice, master: masterInfo, week52 };
        break;

      case 'market-overview':
        result = await koreaInvestmentService.getMarketOverview();
        break;

      case 'master':
        result = await koreaInvestmentService.getStockMaster();
        break;

      case 'top-gainers':
        result = await koreaInvestmentService.getTopGainers((market as 'KOSPI' | 'KOSDAQ' | 'ALL') || 'KOSPI', limit);
        break;

      case 'top-losers':
        result = await koreaInvestmentService.getTopLosers((market as 'KOSPI' | 'KOSDAQ' | 'ALL') || 'KOSPI', limit);
        break;

      case 'top-volume':
        result = await koreaInvestmentService.getTopVolume((market as 'KOSPI' | 'KOSDAQ' | 'ALL') || 'KOSPI', limit);
        break;

      case 'search':
        const query = searchParams.get('q');
        if (!query) {
          return apiError('Query is required', 400);
        }
        const master = await koreaInvestmentService.getStockMaster();
        result = master.filter(
          (s) =>
            s.name.includes(query) ||
            s.code.includes(query) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, limit);
        break;

      default:
        return apiError('Invalid action', 400);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error('[API] Stock error:', error);
    return apiError('Failed to fetch stock data', 500);
  }
}
