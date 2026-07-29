import { NextResponse } from 'next/server';
import { searchNaverNews, searchNaverNewsByDate } from '@/lib/services/search/naver-news-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiSearchNaver')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || searchParams.get('query') || '';

  if (!query.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "q" is required' },
      { status: 400 },
    );
  }

  const display = parseInt(searchParams.get('display') || '10');
  const start = parseInt(searchParams.get('start') || '1');
  const sort = (searchParams.get('sort') || 'sim') as 'sim' | 'date';

  try {
    const searchFn = sort === 'date' ? searchNaverNewsByDate : searchNaverNews;
    const result = await searchFn(query, { display, start, sort });

    return NextResponse.json({
      success: true,
      data: {
        articles: result.articles,
        total: result.total,
        display: result.display,
        query,
        sort,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    log.error(`[NaverSearch API] ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
