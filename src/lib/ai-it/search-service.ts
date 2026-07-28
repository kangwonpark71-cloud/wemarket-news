import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import { containsFilter } from '@/lib/db-utils';
import { parseList } from '@/lib/utils/list-fields';

export interface SearchParams {
  query?: string;
  category?: 'ai' | 'it';
  subcategory?: string;
  sourceId?: string;
  language?: 'ko' | 'en';
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'fetchedAt' | 'title' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export type SearchArticle = Prisma.ArticleGetPayload<{
  include: {
    source: true;
    summary: true;
    tags: {
      include: { tag: true };
    };
  };
}>;

export interface SearchResult {
  articles: SearchArticle[];
  total: number;
  page: number;
  totalPages: number;
  facets?: {
    categories: { name: string; count: number }[];
    sources: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    languages: { name: string; count: number }[];
  };
}

function buildSearchWhere(params: SearchParams): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {};

  // Source filters
  const sourceFilter: Prisma.SourceWhereInput = {};
  if (params.category) {
    sourceFilter.category = params.category;
  }
  if (params.subcategory) {
    sourceFilter.subcategory = params.subcategory;
  }
  if (params.sourceId) {
    sourceFilter.id = params.sourceId;
  }
  if (Object.keys(sourceFilter).length > 0) {
    where.source = sourceFilter;
  }

  // Language filter
  if (params.language) {
    where.language = params.language;
  }

  // Date range filter
  if (params.dateFrom || params.dateTo) {
    where.publishedAt = {};
    if (params.dateFrom) where.publishedAt.gte = params.dateFrom;
    if (params.dateTo) where.publishedAt.lte = params.dateTo;
  }

  // Tag filter
  if (params.tags && params.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: params.tags },
        },
      },
    };
  }

  // Text search
  if (params.query) {
    const searchTerms = params.query.trim().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 1) {
      const term = searchTerms[0].toLowerCase();
      where.OR = [
        { title: containsFilter(term) },
        { description: containsFilter(term) },
        { content: containsFilter(term) },
        { summary: { summary3Line: containsFilter(term) } },
        { tags: { some: { tag: { name: containsFilter(term) } } } },
      ];
    } else {
      where.AND = searchTerms.map(term => ({
        OR: [
          { title: containsFilter(term) },
          { description: containsFilter(term) },
          { content: containsFilter(term) },
          { summary: { summary3Line: containsFilter(term) } },
          { tags: { some: { tag: { name: containsFilter(term) } } } },
        ],
      }));
    }
  }

  return where;
}

function getSortOrder(params: SearchParams): Prisma.ArticleOrderByWithRelationInput {
  const sortBy = params.sortBy || 'publishedAt';
  const sortOrder = params.sortOrder || 'desc';

  switch (sortBy) {
    case 'relevance':
      return { publishedAt: sortOrder };
    case 'title':
      return { title: sortOrder };
    case 'fetchedAt':
      return { fetchedAt: sortOrder };
    default:
      return { publishedAt: sortOrder };
  }
}

export async function searchAIITNews(params: SearchParams): Promise<SearchResult> {
  const {
    page = 1,
    limit = 20,
  } = params;

  const where = buildSearchWhere(params);
  const orderBy = getSortOrder(params);

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        source: true,
        summary: true,
        tags: {
          include: { tag: true },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  // Get facets for filtering
  const [categories, sources, tags, languages] = await Promise.all([
    prisma.article.groupBy({
      by: ['categoryId'],
      where: { ...where, categoryId: { not: null } },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 20,
    }),
    prisma.source.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, subcategory: true, _count: { select: { articles: true } } },
      orderBy: { articles: { _count: 'desc' } },
      take: 20,
    }),
    prisma.newsTag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { articles: { _count: 'desc' } },
      take: 30,
    }),
    prisma.article.groupBy({
      by: ['language'],
      _count: { language: true },
    }),
  ]);

  return {
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    facets: {
      categories: categories.map(c => ({ name: c.categoryId!, count: c._count.categoryId })),
      sources: sources.map(s => ({ name: s.name, count: s._count.articles })),
      tags: tags.map(t => ({ name: t.name, count: t._count.articles })),
      languages: languages.map(l => ({ name: l.language, count: l._count.language })),
    },
  };
}

export async function getSearchSuggestions(query: string, limit = 10): Promise<string[]> {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  const [titleMatches, tagMatches, companyMatches] = await Promise.all([
    prisma.article.findMany({
      where: {
        title: containsFilter(lowerQuery),
      },
      select: { title: true },
      take: limit,
      distinct: ['title'],
    }),
    prisma.newsTag.findMany({
      where: {
        name: containsFilter(lowerQuery),
        isActive: true,
      },
      select: { name: true },
      take: limit,
    }),
    prisma.article.findMany({
      where: { summary: { isNot: null } },
      select: { summary: { select: { relatedCompanies: true } } },
      take: limit * 3,
    }),
  ]);

  const suggestions = new Set<string>();

  titleMatches.forEach(a => suggestions.add(a.title));
  tagMatches.forEach(t => suggestions.add(t.name));
  companyMatches.forEach(c => {
    const raw = c.summary?.relatedCompanies;
    const companies = parseList(raw);
    if (companies.length > 0) {
      companies
        .map(comp => comp.trim())
        .filter((comp: string) => comp.length > 0 && comp.toLowerCase().includes(lowerQuery))
        .forEach((comp: string) => suggestions.add(comp));
    }
  });

  return Array.from(suggestions).slice(0, limit);
}

export async function getPopularSearches(limit = 10): Promise<string[]> {
  const tags = await prisma.newsTag.findMany({
    include: { _count: { select: { articles: true } } },
    orderBy: { articles: { _count: 'desc' } },
    take: limit,
  });
  return tags.map(t => t.name);
}

export async function getTrendingTopics(hours = 24, limit = 10): Promise<{ topic: string; count: number }[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const articles = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
    },
    select: {
      title: true,
      summary: { select: { keywords: true, relatedModels: true, relatedCompanies: true } },
      tags: { include: { tag: true } },
    },
    take: 500,
  });

  const topicCounts = new Map<string, number>();

  for (const article of articles) {
    const keywords = parseList(article.summary?.keywords);
    const models = parseList(article.summary?.relatedModels);
    const companies = parseList(article.summary?.relatedCompanies);
    const tags = article.tags.map(t => t.tag.name);

    for (const term of [...keywords, ...models, ...companies, ...tags]) {
      topicCounts.set(term, (topicCounts.get(term) || 0) + 1);
    }
  }

  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }));
}