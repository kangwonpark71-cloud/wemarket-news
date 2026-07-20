import prisma from '@/lib/db';
import { AIITParsedArticle } from './fetcher';
import { Prisma, Article, Source, NewsSummary } from '@prisma/client';

export type AINewsWithSource = Article & { source: Source; summary?: NewsSummary | null; tags?: { tag: { name: string } }[] };
export type ITSummaryWithNews = NewsSummary & { news: Article };

export async function upsertAIITArticles(
  sourceId: string,
  articles: AIITParsedArticle[]
): Promise<{ newCount: number; totalCount: number }> {
  let newCount = 0;

  for (const article of articles) {
    try {
      const existing = await prisma.article.findUnique({
        where: { url: article.url },
      });

      if (!existing) {
        await prisma.article.create({
          data: {
            sourceId,
            sourceType: 'AI_IT',
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
  excludeSourceIds?: string[];
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
    excludeSourceIds,
  } = params;

  const where: Prisma.ArticleWhereInput = {
    source: { sourceType: 'AI_IT' } as Prisma.SourceWhereInput,
  };

  if (excludeSourceIds && excludeSourceIds.length > 0) {
    where.sourceId = { notIn: excludeSourceIds };
  }

  const sourceFilter: Record<string, unknown> = {};
  if (category) sourceFilter.category = category;
  if (subcategory) sourceFilter.subcategory = subcategory;
  if (sourceId) sourceFilter.id = sourceId;
  if (Object.keys(sourceFilter).length > 0) {
    where.source = { sourceType: 'AI_IT', ...sourceFilter } as Prisma.SourceWhereInput;
  }

  if (language) {
    where.language = language;
  }

  if (dateFrom || dateTo) {
    where.publishedAt = {};
    if (dateFrom) where.publishedAt.gte = dateFrom;
    if (dateTo) where.publishedAt.lte = dateTo;
  }

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
    include: { source: true, tags: { include: { tag: true } }, summary: true },
  });
  return article as AINewsWithSource | null;
}

export async function getRelatedAIITArticles(
  id: string,
  limit = 4,
): Promise<AINewsWithSource[]> {
  const current = await prisma.article.findUnique({
    where: { id },
    include: { summary: true },
  });
  if (!current) return [];

  const keywordRaw = current.summary?.keywords ?? '';
  const keywords = (Array.isArray(keywordRaw) ? keywordRaw.join(',') : keywordRaw)
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const candidates = await prisma.article.findMany({
    where: {
      id: { not: id },
      sourceType: 'AI_IT',
      OR: [
        { sourceId: current.sourceId },
        ...(keywords.length > 0
          ? [{ summary: { keywords: { hasSome: keywords } } }]
          : []),
      ],
    },
    include: { source: true, tags: { include: { tag: true } }, summary: true },
    orderBy: { publishedAt: 'desc' },
    take: limit * 2,
  });

  const sameSource = candidates.filter((a) => a.sourceId === current.sourceId);
  const keywordMatches = candidates.filter((a) => {
    if (a.sourceId === current.sourceId) return false;
    const otherRaw = a.summary?.keywords ?? '';
    const otherKeywords = (Array.isArray(otherRaw) ? otherRaw.join(',') : otherRaw)
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    return keywords.some((k) => otherKeywords.includes(k));
  });

  const ranked = [...sameSource, ...keywordMatches].slice(0, limit);
  if (ranked.length >= limit) return ranked as AINewsWithSource[];

  const fallback = await prisma.article.findMany({
    where: { id: { not: id }, sourceType: 'AI_IT' },
    include: { source: true, tags: { include: { tag: true } }, summary: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  const seen = new Set(ranked.map((a) => a.id));
  return [...ranked, ...fallback.filter((a) => !seen.has(a.id))].slice(0, limit) as AINewsWithSource[];
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
    prisma.article.count({ where: { source: { sourceType: 'AI_IT' } } }),
    prisma.source.count({ where: { isActive: true, sourceType: 'AI_IT' } }),
    prisma.fetchLog.findFirst({
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    }),
    prisma.article.groupBy({
      by: ['categoryId'],
      _count: true,
      where: { source: { sourceType: 'AI_IT' }, categoryId: { not: null } },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 10,
    }),
    prisma.article.groupBy({
      by: ['language'],
      _count: true,
      where: { source: { sourceType: 'AI_IT' } },
    }),
    prisma.article.groupBy({
      by: ['sourceId'],
      _count: true,
      where: { source: { sourceType: 'AI_IT' } },
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
  const sources = await prisma.source.findMany({
    where: { category, isActive: true, sourceType: 'AI_IT' },
    select: { id: true, subcategory: true },
  });

  const subcategoryCounts: Record<string, number> = {};

  for (const source of sources) {
    if (source.subcategory) {
      const count = await prisma.article.count({
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
    translatedTitle?: string;
    summary3Line: string;
    keywords: string[];
    relatedCompanies: string[];
    relatedModels: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }
): Promise<NewsSummary> {
  return prisma.newsSummary.upsert({
    where: { articleId: newsId },
    update: {
      translatedTitle: summaryData.translatedTitle,
      summary3Line: summaryData.summary3Line,
      keywords: summaryData.keywords,
      relatedCompanies: summaryData.relatedCompanies,
      relatedModels: summaryData.relatedModels,
      difficulty: summaryData.difficulty,
    },
    create: {
      articleId: newsId,
      translatedTitle: summaryData.translatedTitle,
      summary3Line: summaryData.summary3Line,
      keywords: summaryData.keywords,
      relatedCompanies: summaryData.relatedCompanies,
      relatedModels: summaryData.relatedModels,
      difficulty: summaryData.difficulty,
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

// NewsSummary stores keywords/companies/models as scalar string[] (Prisma String[]).
// Normalize both array and legacy comma-string forms at the boundary for the reader UI.
function parseList(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : value.split(',');
  return items
    .map(item => String(item).trim())
    .filter(item => item.length > 0);
}

export type ReaderSummary = {
  translatedTitle?: string | null
  summary3Line: string
  keywords: string[]
  relatedCompanies: string[]
  relatedModels: string[]
  difficulty: string
}

export function toReaderSummary(summary: NewsSummary | null | undefined): ReaderSummary | null {
  if (!summary) return null;
  return {
    translatedTitle: summary.translatedTitle,
    summary3Line: summary.summary3Line,
    keywords: parseList(summary.keywords),
    relatedCompanies: parseList(summary.relatedCompanies),
    relatedModels: parseList(summary.relatedModels),
    difficulty: summary.difficulty ?? 'beginner',
  };
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
        fetchType: src.type,
        crawlerConfig: src.crawlerConfig,
      })
      count++
    } catch (e) {
      console.warn(`[SeedAIIT] Failed to upsert ${src.nameEn}:`, e)
    }
  }
  return count
}

// Source operations - now using unified Source table with sourceType='AI_IT'
export async function getAIITSourceByNameEn(nameEn: string) {
  return prisma.source.findUnique({
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
  fetchType?: 'rss' | 'crawler';
  crawlerConfig?: unknown;
}): Promise<string> {
  const existing = await prisma.source.findUnique({
    where: { nameEn: source.nameEn },
  });

  const fetchType = source.fetchType ?? 'rss';
  const crawlerConfig = source.crawlerConfig as
    | Prisma.InputJsonValue
    | undefined;

  let sourceId: string;

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: {
        ...source,
        sourceType: 'AI_IT',
        fetchType,
        crawlerConfig,
      },
    });
    sourceId = existing.id;
  } else {
    const created = await prisma.source.create({
      data: {
        ...source,
        sourceType: 'AI_IT',
        fetchInterval: source.fetchInterval ?? 60,
        fetchType,
        crawlerConfig,
      },
    });
    sourceId = created.id;
  }

  return sourceId;
}

export async function getActiveAIITSources(category?: 'ai' | 'it') {
  return prisma.source.findMany({
    where: {
      isActive: true,
      sourceType: 'AI_IT',
      ...(category ? { category } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

// Fetch log operations - using unified FetchLog table
export async function logAIITFetch(
  sourceId: string,
  status: 'success' | 'error' | 'partial',
  count: number,
  newCount: number,
  duration: number,
  error?: string
): Promise<void> {
  await prisma.fetchLog.create({
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
  return prisma.fetchLog.findMany({
    where: sourceId ? { sourceId } : {},
    include: { source: true },
    orderBy: { fetchedAt: 'desc' },
    take: limit,
  });
}
