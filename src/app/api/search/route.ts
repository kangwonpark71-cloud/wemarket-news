import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiSearch');

const LIMIT_MAX = 100;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim();
    const sourceName = searchParams.get('source')?.trim();
    const language = searchParams.get('language')?.trim();
    const tag = searchParams.get('tag')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = (searchParams.get('sortBy') || 'publishedAt') as 'publishedAt' | 'relevance';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (limit > LIMIT_MAX) {
      return apiError(`Limit cannot exceed ${LIMIT_MAX}`, 400);
    }

    const skip = (page - 1) * limit;

    // Resolve source ID
    let sourceId: string | null = null;
    if (sourceName) {
      const src = await prisma.source.findFirst({
        where: { name: { contains: sourceName } },
        select: { id: true },
      });
      if (!src) {
        return apiSuccess({ articles: [], total: 0, page, limit, totalPages: 0, query: q });
      }
      sourceId = src.id;
    }

    // Resolve category source IDs
    let categorySourceIds: string[] = [];
    if (category) {
      const sources = await prisma.source.findMany({
        where: {
          OR: [
            { category: { contains: category } },
            { subcategory: { contains: category } },
          ],
        },
        select: { id: true },
      });
      categorySourceIds = sources.map((s) => s.id);
    }

    // Resolve tag IDs
    let tagIds: string[] = [];
    if (tag) {
      const tags = await prisma.newsTag.findMany({
        where: { name: { contains: tag, mode: 'insensitive' }, isActive: true },
        select: { id: true },
      });
      tagIds = tags.map((t) => t.id);
    }

    // Build AND conditions with relevance scoring
    const andConditions: Array<Record<string, unknown>> = [];

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { content: { contains: q, mode: 'insensitive' as const } },
          { translatedContent: { contains: q, mode: 'insensitive' as const } },
        ],
      });
    }

    if (sourceId) {
      andConditions.push({ sourceId });
    }

    if (categorySourceIds.length > 0) {
      andConditions.push({ sourceId: { in: categorySourceIds } });
    }

    if (language) {
      andConditions.push({ language });
    }

    if (tagIds.length > 0) {
      andConditions.push({
        tags: {
          some: { tagId: { in: tagIds } },
        },
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : undefined;

    // Sort: relevance uses keyword match scoring, publishedAt uses date
    let orderBy: Record<string, unknown>;
    if (sortBy === 'relevance' && q) {
      // Relevance: title match > content match > tag match
      // We sort by a computed relevance score using Prisma's raw query
      // Fallback: publishedAt desc for relevance queries
      orderBy = {
        _relevance: {
          fields: ['title', 'content', 'translatedContent'],
          search: q,
          order: 'desc',
        },
      } as Record<string, unknown>;
      // If Prisma doesn't support _relevance, use publishedAt as fallback
      orderBy = { publishedAt: 'desc' };
    } else {
      orderBy = { publishedAt: sortOrder };
    }

    // Execute count and query in parallel
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          source: { select: { name: true, sourceType: true, category: true } },
          tags: { include: { tag: { select: { name: true, type: true } } } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    // Compute relevance score for each article when sorting by relevance
    let scoredArticles = articles;
    if (sortBy === 'relevance' && q) {
      const qLower = q.toLowerCase();
      scoredArticles = articles.map((a) => {
        let score = 0;
        if (a.title.toLowerCase().includes(qLower)) score += 10;
        const content = (a.content || '').toLowerCase();
        if (content.includes(qLower)) score += 3;
        if (a.translatedContent && a.translatedContent.toLowerCase().includes(qLower)) score += 2;
        if (a.source.name.toLowerCase().includes(qLower)) score += 1;
        return { ...a, _score: score };
      });
      scoredArticles.sort((a, b) => (b as unknown as { _score: number })._score - (a as unknown as { _score: number })._score);
    }

    const totalPages = Math.ceil(total / limit);

    log.info('Search completed', { q, category, sourceName, language, tag, page, total });

    return apiSuccess({
      articles: scoredArticles,
      total,
      page,
      limit,
      totalPages,
      query: q,
      sortBy,
      sortOrder,
    });
  } catch (error) {
    log.error('Search failed:', error);
    return apiError('Search failed', 500);
  }
}
