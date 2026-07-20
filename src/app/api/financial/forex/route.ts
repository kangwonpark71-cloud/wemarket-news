import { NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market/market-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'rates';
  const base = searchParams.get('base');
  const quote = searchParams.get('quote') || 'KRW';

  try {
    let result: unknown;

    switch (action) {
      case 'rate':
        if (!base) {
          return NextResponse.json(
            { success: false, error: 'Base currency is required' },
            { status: 400 }
          );
        }
        result = await marketService.getExchangeRate(base, quote);
        break;

      case 'rates':
        result = await marketService.getAllExchangeRates();
        break;

      case 'daily-stat':
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        result = await marketService.getForexDailyStat(date);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] Forex error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch forex data' },
      { status: 500 }
    );
  }
}
