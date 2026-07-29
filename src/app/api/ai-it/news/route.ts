import { NextRequest, NextResponse } from 'next/server';
import { getAIITArticles } from '@/lib/ai-it/db-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitNews')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const subcategory = searchParams.get('subcategory');
    const language = searchParams.get('language') as 'ko' | 'en' | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'publishedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const sourceId = searchParams.get('sourceId');

    const result = await getAIITArticles({
      category: category || undefined,
      subcategory: subcategory || undefined,
      language: language || undefined,
      page,
      limit,
      search: search || undefined,
      sortBy,
      sortOrder,
      sourceId: sourceId || undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    log.error('[API] AI/IT News list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}