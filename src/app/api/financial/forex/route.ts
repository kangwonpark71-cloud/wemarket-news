import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { marketService } from '@/lib/services/market/market-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialForex')

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
          return apiError('Base currency is required', 400);
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
        return apiError('Invalid action', 400);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error('[API] Forex error:', error);
    return apiError('Failed to fetch forex data', 500);
  }
}
