import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticlesPopular')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  try {
    const cacheKey = CacheKeys.articles({ _popular: String(limit) });
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const articles = await prisma.article.findMany({
      where: { viewCount: { gt: 0 } },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        url: true,
        viewCount: true,
        publishedAt: true,
        source: { select: { name: true, nameEn: true } },
      },
    });

    await cacheService.set(cacheKey, articles, { ttl: CacheTTL.MINUTE_5 });

    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    log.error('Failed to fetch popular articles:', error);
    return apiError('Failed to fetch popular articles', 500);
  }
}
