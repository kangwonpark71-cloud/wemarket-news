import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { translateUntranslatedOverseas } from '@/lib/ai/translation-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticlesTranslatebatch')

export async function POST(request: Request) {
  try {
    const { limit = 50 } = await request.json().catch(() => ({}));

    const result = await translateUntranslatedOverseas(limit);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Translated ${result.translated} of ${result.total} articles (${result.failed} failed)`,
    });
  } catch (error) {
    log.error('[POST /api/articles/translate-batch]', error);
    return apiError('Batch translation failed', 500);
  }
}
