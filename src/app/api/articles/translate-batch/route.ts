import { NextResponse } from 'next/server';
import { translateUntranslatedOverseas } from '@/lib/ai/translation-service';

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
    console.error('[POST /api/articles/translate-batch]', error);
    return NextResponse.json(
      { success: false, error: 'Batch translation failed' },
      { status: 500 },
    );
  }
}
