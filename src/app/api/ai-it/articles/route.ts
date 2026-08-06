import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { getAIITArticles, getAIITArticleById, getAIITArticleByUrl, getAIITArticleStats, getSubcategoriesWithCount } from '@/lib/ai-it/db-service';
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitArticles')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    const url = searchParams.get('url');

    if (action === 'stats') {
      const statsCacheKey = 'ai-it:articles:stats';
      const cached = await cacheService.get(statsCacheKey);
      if (cached) return NextResponse.json({ success: true, ...cached as Record<string, unknown> });
      const stats = await getAIITArticleStats();
      await cacheService.set(statsCacheKey, stats, { ttl: CacheTTL.MINUTE_5 });
      return NextResponse.json({ success: true, ...stats });
    }

    if (action === 'subcategories') {
      const category = searchParams.get('category') as 'ai' | 'it' | null;
      if (!category) {
        return apiError('Category required', 400);
      }
      const subcategories = await getSubcategoriesWithCount(category);
      return NextResponse.json({ success: true, subcategories });
    }

    if (id) {
      const article = await getAIITArticleById(id);
      if (!article) {
        return apiError('Article not found', 404);
      }
      return NextResponse.json({ success: true, article });
    }

    if (url) {
      const article = await getAIITArticleByUrl(url);
      if (!article) {
        return apiError('Article not found', 404);
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

    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => c.trim().split('='))
    );
    const token = cookies['session'];
    let excludeSourceIds: string[] = [];

    if (token) {
      const { verifySessionToken } = await import('@/lib/utils/auth');
      const userId = await verifySessionToken(token);
      if (userId) {
        const { prisma } = await import('@/lib/db');
        const pref = await prisma.userPreference.findUnique({
          where: { userId },
          select: { hiddenSources: true },
        });
        if (pref && pref.hiddenSources) {
          excludeSourceIds = pref.hiddenSources.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    }

    const cacheKey = CacheKeys.aiItArticles({
      category: category || undefined,
      subcategory: subcategory || undefined,
      language: language || undefined,
      page: String(page), limit: String(limit),
      search: search || undefined,
      sortBy, sortOrder,
      sourceId: sourceId || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      hidden: excludeSourceIds.length > 0 ? '1' : undefined,
    });

    if (excludeSourceIds.length === 0) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return NextResponse.json({ success: true, ...cached as Record<string, unknown> });
    }

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
      excludeSourceIds,
    });

    if (excludeSourceIds.length === 0) {
      await cacheService.set(cacheKey, result, { ttl: CacheTTL.MINUTE });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    log.error('[API] AI/IT Articles error:', error);
    return apiError('Failed to fetch articles', 500);
  }
}