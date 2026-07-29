import { NextResponse } from 'next/server';
import { getAIITArticleStats, getActiveAIITSources, getSubcategoriesWithCount } from '@/lib/ai-it/db-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitStats')

export async function GET() {
  try {
    const [stats, sources, aiSubcategories, itSubcategories] = await Promise.all([
      getAIITArticleStats(),
      getActiveAIITSources(),
      getSubcategoriesWithCount('ai'),
      getSubcategoriesWithCount('it'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        sources,
        subcategories: {
          ai: aiSubcategories,
          it: itSubcategories,
        },
      },
    });
  } catch (error) {
    log.error('[API] AI/IT Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}