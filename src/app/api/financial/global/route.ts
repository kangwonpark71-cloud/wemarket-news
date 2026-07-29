import { NextResponse } from 'next/server';
import { marketService } from '@/lib/services/market/market-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiFinancialGlobal')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'indices';

  try {
    let result: unknown;

    switch (action) {
      case 'indices':
        const indices = await marketService.getGlobalIndices();
        result = indices;
        break;

      case 'index':
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol is required' },
            { status: 400 }
          );
        }
        result = await marketService.getGlobalIndex(symbol);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error('[API] Global indices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch global indices' },
      { status: 500 }
    );
  }
}