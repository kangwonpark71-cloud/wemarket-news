import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { getArticles, getArticleStats } from '@/lib/rss/db-service'
import { prisma } from '@/lib/db'
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticles')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const category = searchParams.get('category') || undefined
  const source = searchParams.get('source') || undefined
  const language = searchParams.get('language') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const search = searchParams.get('search') || undefined
  const sortBy = searchParams.get('sortBy') || 'publishedAt'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  const includeStats = searchParams.get('stats') === 'true'

  try {
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
        const pref = await prisma.userPreference.findUnique({
          where: { userId },
          select: { hiddenSources: true },
        });
        if (pref && pref.hiddenSources) {
          excludeSourceIds = pref.hiddenSources.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
    }

    // Check cache (skip for authenticated users with hidden sources)
    const cacheKey = CacheKeys.articles({
      category, source, language,
      page: String(page), limit: String(Math.min(limit, 100)),
      search, sortBy, sortOrder,
      hidden: excludeSourceIds.length > 0 ? '1' : undefined,
    });

    if (excludeSourceIds.length === 0) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        let stats = null;
        if (includeStats) {
          const statsCacheKey = CacheKeys.articles({ _stats: '1' });
          stats = await cacheService.get(statsCacheKey);
          if (!stats) {
            stats = await getArticleStats();
            await cacheService.set(statsCacheKey, stats, { ttl: CacheTTL.MINUTE_5 });
          }
        }
        return NextResponse.json({ success: true, data: cached, stats });
      }
    }

    const result = await getArticles({
      category,
      sourceName: source,
      language,
      page,
      limit: Math.min(limit, 100),
      search,
      sortBy,
      sortOrder,
      excludeSourceIds,
    })

    // Cache result (only for non-personalized queries)
    if (excludeSourceIds.length === 0) {
      await cacheService.set(cacheKey, result, { ttl: CacheTTL.MINUTE_5 });
    }

    let stats = null
    if (includeStats) {
      const statsCacheKey = CacheKeys.articles({ _stats: '1' });
      stats = await cacheService.get(statsCacheKey);
      if (!stats) {
        stats = await getArticleStats();
        await cacheService.set(statsCacheKey, stats, { ttl: CacheTTL.MINUTE_5 });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      stats,
    })
  } catch (error) {
    log.error('Failed to fetch articles:', error)
    return apiError('Failed to fetch articles', 500)
  }
}
