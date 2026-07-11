import { NextRequest, NextResponse } from 'next/server';
import { getAIITArticles, getAIITArticleById, getAIITArticleByUrl, getAIITArticleStats, getSubcategoriesWithCount } from '@/lib/ai-it/db-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const url = searchParams.get('url');

    if (action === 'stats') {
      const stats = await getAIITArticleStats();
      return NextResponse.json({ success: true, ...stats });
    }

    if (action === 'subcategories') {
      const category = searchParams.get('category') as 'ai' | 'it' | null;
      if (!category) {
        return NextResponse.json({ success: false, error: 'Category required' }, { status: 400 });
      }
      const subcategories = await getSubcategoriesWithCount(category);
      return NextResponse.json({ success: true, subcategories });
    }

    if (id) {
      const article = await getAIITArticleById(id);
      if (!article) {
        return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, article });
    }

    if (url) {
      const article = await getAIITArticleByUrl(url);
      if (!article) {
        return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, article });
    }

    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const subcategory = searchParams.get('subcategory');
    const language = searchParams.get('language');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'publishedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const sourceId = searchParams.get('sourceId');
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

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
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] AI/IT Articles error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}