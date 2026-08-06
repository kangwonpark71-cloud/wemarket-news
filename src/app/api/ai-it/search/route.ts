import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { searchAIITNews, getSearchSuggestions, getPopularSearches, getTrendingTopics } from '@/lib/ai-it/search-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitSearch')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'suggest') {
      const query = searchParams.get('q') || '';
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const suggestions = await getSearchSuggestions(query, limit);
      return NextResponse.json({ success: true, suggestions });
    }

    if (action === 'popular') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const popular = await getPopularSearches(limit);
      return NextResponse.json({ success: true, popular });
    }

    if (action === 'trending') {
      const hours = parseInt(searchParams.get('hours') || '24', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const trending = await getTrendingTopics(hours, limit);
      return NextResponse.json({ success: true, trending });
    }

    const query = searchParams.get('q');
    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const subcategory = searchParams.get('subcategory');
    const language = searchParams.get('language') as 'ko' | 'en' | null;
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = (searchParams.get('sortBy') || 'publishedAt') as 'publishedAt' | 'fetchedAt' | 'title' | 'relevance';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    const result = await searchAIITNews({
      query: query || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      language: language || undefined,
      tags: tags || undefined,
      dateFrom,
      dateTo,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    log.error('[API] AI/IT Search error:', error);
    return apiError('Failed to search', 500);
  }
}