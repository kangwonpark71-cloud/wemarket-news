import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiSearch');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category')?.trim();
    const sourceName = searchParams.get('source')?.trim();
    const language = searchParams.get('language')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = (searchParams.get('sortBy') || 'publishedAt') as 'publishedAt' | 'relevance';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    if (limit > 100) {
      return apiError('Limit cannot exceed 100', 400);
    }

    const skip = (page - 1) * limit;

    // Resolve source name to ID first (to use in AND with other filters)
    let sourceId: string | null = null;
    if (sourceName) {
      const src = await prisma.source.findFirst({
        where: { name: { contains: sourceName } },
        select: { id: true },
      });
      if (!src) {
        return apiSuccess({ articles: [], total: 0, page, limit, totalPages: 0 });
      }
      sourceId = src.id;
    }

    // Resolve category to source IDs (for AND with source filter)
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

    // Build AND conditions
    const andConditions: Array<Record<string, unknown>> = [];

    if (q) {
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { translatedContent: { contains: q, mode: 'insensitive' } },
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

    const where = andConditions.length > 0 ? { AND: andConditions } : undefined;

    // Determine sort order
    const orderBy: Record<string, unknown> =
      sortBy === 'relevance' && q ? { publishedAt: 'desc' } : { publishedAt: sortOrder };

    // Search across both RSS and AI/IT articles
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          source: { select: { name: true, sourceType: true, category: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    log.info('Search completed', { q, category: categorySourceIds.length, sourceName: sourceId ? 'resolved' : null, language, page, total });

    return apiSuccess({
      articles,
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
