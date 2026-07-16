import prisma from '@/lib/db';
import { AIITParsedArticle } from './fetcher';
import { Prisma, NewsArticle, NewsSource, NewsSummary } from '@prisma/client';

export type AINewsWithSource = NewsArticle & { source: NewsSource; summary?: NewsSummary | null; tags?: { tag: { name: string } }[] };
export type ITSummaryWithNews = NewsSummary & { news: NewsArticle };

export async function upsertAIITArticles(
  sourceId: string,
  articles: AIITParsedArticle[]
): Promise<{ newCount: number; totalCount: number }> {
  let newCount = 0;

  for (const article of articles) {
    try {
      const existing = await prisma.newsArticle.findUnique({
        where: { url: article.url },
      });

      if (!existing) {
        await prisma.newsArticle.create({
          data: {
            sourceId,
            guid: article.guid,
            title: article.title,
            url: article.url,
            description: article.description,
            content: article.content,
            author: article.author,
            thumbnail: article.thumbnail,
            publishedAt: article.publishedAt,
            language: article.language,
          },
        });

        // Dual-write to unified Article model
        try {
          await prisma.article.create({
            data: {
              sourceId,
              sourceType: 'AI_IT' as any,
              guid: article.guid,
              title: article.title,
              url: article.url,
              description: article.description,
              content: article.content,
              author: article.author,
              thumbnail: article.thumbnail,
              publishedAt: article.publishedAt,
              language: article.language,
            },
          });
        } catch (unifiedErr) {
          console.warn(`[AIIT DB] Unified article write skipped:`, unifiedErr instanceof Error ? unifiedErr.message : unifiedErr)
        }

        newCount++;
      }
    } catch (err) {
      console.warn(`[AIIT DB] Skipping article "${article.title?.substring(0, 50)}":`, err instanceof Error ? err.message : err)
    }
  }

  return { newCount, totalCount: articles.length };
}

export async function getAIITArticles(params: {
  category?: 'ai' | 'it';
  subcategory?: string;
  language?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): Promise<{
  articles: AINewsWithSource[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    category,
    subcategory,
    language,
    page = 1,
    limit = 20,
    search,
    sortBy = 'publishedAt',
    sortOrder = 'desc',
    sourceId,
    dateFrom,
    dateTo,
  } = params;

  const where: Prisma.ArticleWhereInput = {};

  // Source filters
  const sourceFilter: Prisma.SourceWhereInput = {};
  if (category) {
    sourceFilter.category = category;
  }
  if (subcategory) {
    sourceFilter.subcategory = subcategory;
  }
  if (sourceId) {
    sourceFilter.id = sourceId;
  }
  if (Object.keys(sourceFilter).length > 0) {
    where.source = sourceFilter;
  }

  // Language filter
  if (language) {
    where.language = language;
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.publishedAt = {};
    if (dateFrom) where.publishedAt.gte = dateFrom;
    if (dateTo) where.publishedAt.lte = dateTo;
  }

  // Search filter
  if (search) {
    const searchLower = search.toLowerCase();
    where.OR = [
      { title: { contains: searchLower } },
      { description: { contains: searchLower } },
      { content: { contains: searchLower } },
    ];
  }

  const allowedSortFields = ['publishedAt', 'fetchedAt', 'title', 'createdAt'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'publishedAt';

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { source: true },
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return {
    articles: articles as AINewsWithSource[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAIITArticleById(id: string): Promise<AINewsWithSource | null> {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { source: true, tags: { include: { tag: true } } },
  });
  return article as AINewsWithSource | null;
}

export async function getAIITArticleByUrl(url: string): Promise<AINewsWithSource | null> {
  const article = await prisma.article.findUnique({
    where: { url },
    include: { source: true },
  });
  return article as AINewsWithSource | null;
}

export async function markAsRead(id: string): Promise<void> {
  await prisma.article.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function toggleBookmark(id: string): Promise<boolean> {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) throw new Error('Article not found');

  const updated = await prisma.article.update({
    where: { id },
    data: { isBookmarked: !article.isBookmarked },
  });

  return updated.isBookmarked;
}

export async function getRecentArticlesBySource(sourceId: string, limit = 10): Promise<AINewsWithSource[]> {
  const articles = await prisma.article.findMany({
    where: { sourceId },
    include: { source: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  return articles as AINewsWithSource[];
}

export async function getAIITArticleStats(): Promise<{
  totalArticles: number;
  totalSources: number;
  lastFetchAt: Date | null;
  topSources: { sourceId: string; count: number }[];
  articlesByCategory: { category: string; count: number }[];
  articlesByLanguage: { language: string; count: number }[];
}> {
  const [totalArticles, totalSources, lastFetch, articlesByCategory, articlesByLanguage, topSources] = await Promise.all([
    prisma.article.count(),
    prisma.source.count({ where: { isActive: true } }),
    prisma.newsFetchLog.findFirst({
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    }),
    prisma.article.groupBy({
      by: ['categoryId'],
      _count: true,
      orderBy: { _count: { categoryId: 'desc' } },
      take: 10,
    }),
    prisma.article.groupBy({
      by: ['language'],
      _count: true,
    }),
    prisma.article.groupBy({
      by: ['sourceId'],
      _count: true,
      orderBy: { _count: { sourceId: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalArticles,
    totalSources,
    lastFetchAt: lastFetch?.fetchedAt || null,
    topSources: topSources.map(s => ({ sourceId: s.sourceId, count: s._count })),
    articlesByCategory: articlesByCategory.map(c => ({ category: c.categoryId || '', count: c._count })),
    articlesByLanguage: articlesByLanguage.map(l => ({ language: l.language, count: l._count })),
  };
}

export async function getSubcategoriesWithCount(category: 'ai' | 'it'): Promise<{ subcategory: string; count: number }[]> {
  const sources = await prisma.newsSource.findMany({
    where: { category, isActive: true },
    select: { id: true, subcategory: true },
  });

  const subcategoryCounts: Record<string, number> = {};
  
  for (const source of sources) {
    if (source.subcategory) {
      const count = await prisma.newsArticle.count({
        where: { sourceId: source.id },
      });
      subcategoryCounts[source.subcategory] = (subcategoryCounts[source.subcategory] || 0) + count;
    }
  }

  return Object.entries(subcategoryCounts)
    .map(([subcategory, count]) => ({ subcategory, count }))
    .sort((a, b) => b.count - a.count);
}

// Summary operations
export async function upsertSummary(
  newsId: string,
  summaryData: {
    summary3Line: string;
    keywords: string[];
    relatedCompanies: string[];
    relatedModels: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    categories: string[];
  }
): Promise<NewsSummary> {
  return prisma.newsSummary.upsert({
    where: { articleId: newsId },
    update: summaryData,
    create: {
      articleId: newsId,
      ...summaryData,
    },
  });
}

export async function getSummaryByNewsId(newsId: string): Promise<NewsSummary | null> {
  return prisma.newsSummary.findUnique({
    where: { articleId: newsId },
  });
}

export async function getSummariesForNews(newsIds: string[]): Promise<NewsSummary[]> {
  return prisma.newsSummary.findMany({
    where: { articleId: { in: newsIds } },
  });
}

// Tag operations
export async function addTagsToNews(newsId: string, tagNames: string[]): Promise<void> {
  for (const tagName of tagNames) {
    const tag = await prisma.newsTag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName, type: 'topic' },
    });

    await prisma.newsTagRelation.upsert({
      where: {
        articleId_tagId: { articleId: newsId, tagId: tag.id },
      },
      update: {},
      create: { articleId: newsId, tagId: tag.id },
    });
  }
}

export async function getTagsForNews(newsId: string): Promise<string[]> {
  const relations = await prisma.newsTagRelation.findMany({
    where: { articleId: newsId },
    include: { tag: true },
  });
  return relations.map(r => r.tag.name);
}

export async function getPopularTags(limit = 50): Promise<{ name: string; count: number }[]> {
  const tags = await prisma.newsTag.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { articles: { _count: 'desc' } },
    take: limit,
  });
  return tags.map(t => ({ name: t.name, count: t._count.articles }));
}

export async function seedAIITSources(): Promise<number> {
  const { ALL_AIIT_SOURCES } = await import('./sources')
  let count = 0
  for (const src of ALL_AIIT_SOURCES) {
    try {
      await upsertAIITSource({
        name: src.name,
        nameEn: src.nameEn,
        url: src.url,
        category: src.category,
        subcategory: src.subcategory,
        language: src.language,
        icon: src.icon,
        fetchInterval: src.fetchInterval,
      })
      count++
    } catch (e) {
      console.warn(`[SeedAIIT] Failed to upsert ${src.nameEn}:`, e)
    }
  }
  console.log(`[SeedAIIT] Seeded ${count}/${ALL_AIIT_SOURCES.length} sources`)
  return count
}

// Source operations
export async function getAIITSourceByNameEn(nameEn: string) {
  return prisma.newsSource.findUnique({
    where: { nameEn },
  });
}

export async function upsertAIITSource(source: {
  name: string;
  nameEn: string;
  url: string;
  category: 'ai' | 'it';
  subcategory: string;
  language: 'ko' | 'en';
  icon?: string;
  fetchInterval?: number;
}): Promise<string> {
  const existing = await prisma.newsSource.findUnique({
    where: { nameEn: source.nameEn },
  });

  let sourceId: string;

  if (existing) {
    await prisma.newsSource.update({
      where: { id: existing.id },
      data: source,
    });
    sourceId = existing.id;
  } else {
    const created = await prisma.newsSource.create({
      data: source,
    });
    sourceId = created.id;
  }

  // Dual-write to unified Source model
  try {
    const existingUnified = await prisma.source.findUnique({
      where: { nameEn: source.nameEn },
    });

    const unifiedData = {
      name: source.name,
      nameEn: source.nameEn,
      url: source.url,
      sourceType: 'AI_IT' as any,
      category: source.category,
      subcategory: source.subcategory,
      language: source.language,
      icon: source.icon,
      fetchInterval: source.fetchInterval ?? 60,
      fetchType: 'rss',
      crawlerConfig: undefined,
    };

    if (existingUnified) {
      await prisma.source.update({
        where: { id: existingUnified.id },
        data: unifiedData,
      });
    } else {
      await prisma.source.create({
        data: unifiedData,
      });
    }
  } catch (unifiedErr) {
    console.warn(`[AIIT DB] Unified source write skipped:`, unifiedErr instanceof Error ? unifiedErr.message : unifiedErr)
  }

  return sourceId;
}

export async function getActiveAIITSources(category?: 'ai' | 'it') {
  return prisma.newsSource.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

// Fetch log operations
export async function logAIITFetch(
  sourceId: string,
  status: 'success' | 'error' | 'partial',
  count: number,
  newCount: number,
  duration: number,
  error?: string
): Promise<void> {
  await prisma.newsFetchLog.create({
    data: {
      sourceId,
      status,
      count,
      newCount,
      duration,
      error,
    },
  });
}

export async function getRecentFetchLogs(sourceId?: string, limit = 50) {
  return prisma.newsFetchLog.findMany({
    where: sourceId ? { sourceId } : {},
    include: { source: true },
    orderBy: { fetchedAt: 'desc' },
    take: limit,
  });
}