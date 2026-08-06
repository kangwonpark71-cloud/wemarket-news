import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { upbitService } from '@/lib/services/crypto/crypto-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialCrypto')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'tickers';
  const symbol = searchParams.get('symbol');
  const unit = searchParams.get('unit') || 'minutes/60';
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    let result: unknown;

    switch (action) {
      case 'tickers':
        const tickers = await upbitService.getAllTickers();
        result = tickers;
        break;

      case 'ticker':
        if (!symbol) {
          return apiError('Symbol is required', 400);
        }
        result = await upbitService.getTicker(symbol);
        break;

      case 'candles':
        if (!symbol) {
          return apiError('Symbol is required', 400);
        }
        result = await upbitService.getCandles(symbol, unit as Parameters<typeof upbitService.getCandles>[1], parseInt(searchParams.get('count') || '200'));
        break;

      case 'top-volume':
        result = await upbitService.getTopVolume(parseInt(searchParams.get('limit') || '20'));
        break;

      case 'top-gainers':
        result = await upbitService.getTopGainers(limit);
        break;

      case 'top-losers':
        result = await upbitService.getTopLosers(limit);
        break;

      case 'markets':
        result = await upbitService.getMarkets();
        break;

      default:
        return apiError('Invalid action', 400);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error('[API] Crypto error:', error);
    return apiError('Failed to fetch crypto data', 500);
  }
}
