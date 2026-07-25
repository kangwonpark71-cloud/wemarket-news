import { NextResponse } from 'next/server';
import { upbitService } from '@/lib/services/crypto/crypto-service';

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
          return NextResponse.json(
            { success: false, error: 'Symbol is required' },
            { status: 400 }
          );
        }
        result = await upbitService.getTicker(symbol);
        break;

      case 'candles':
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol is required' },
            { status: 400 }
          );
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
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] Crypto error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crypto data' },
      { status: 500 }
    );
  }
}
