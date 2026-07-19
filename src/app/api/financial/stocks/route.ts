import { NextResponse } from 'next/server';
import { koreaInvestmentService } from '@/lib/services/financial/financial-service';

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
          return NextResponse.json(
            { success: false, error: 'Code is required' },
            { status: 400 }
          );
        }
        result = await koreaInvestmentService.getStockPrice(code);
        break;

      case 'prices':
        if (codes.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Codes are required' },
            { status: 400 }
          );
        }
        result = await koreaInvestmentService.getStockPrices(codes);
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
          return NextResponse.json(
            { success: false, error: 'Query is required' },
            { status: 400 }
          );
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
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] Stock error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
