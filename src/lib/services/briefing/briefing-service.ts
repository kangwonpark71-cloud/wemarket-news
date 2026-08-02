import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cacheService, CacheTTL } from '@/lib/services/cache/cache-service';

const log = createLogger('BriefingService');

export interface BriefingArticle {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  publishedAt: Date;
  category: string | null;
  source: string | null;
}

export interface BriefingSection {
  key: string;
  label: string;
  articles: BriefingArticle[];
}

export interface TodayBriefing {
  date: string;
  headline: BriefingArticle[];
  sections: BriefingSection[];
  keywords: { keyword: string; count: number }[];
}

const POOL_SIZE = 100;
const HEADLINE_SIZE = 8;
const SECTION_SIZE = 5;
const KEYWORD_LIMIT = 8;
const KEYWORD_SOURCE_TITLES = 50;
const CACHE_KEY = 'briefing:today';

const STOPWORDS = new Set([
  '합니다', '있다', '위해', '통해', '대한', '관련', '밝혔', '나타', '기자', '뉴스',
  '정도', '경우', '때문', '이후', '지난', '올해', '내년', '국내', '시장', '경제',
  '세계', '회사', '앞두', '들이', '하고', '하며', '라는', '있는', '없는', '된다',
]);

function mapArticle(a: {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  publishedAt: Date;
  category: string | null;
  source: { name: string; nameEn: string } | null;
}): BriefingArticle {
  return {
    id: a.id,
    title: a.title,
    url: a.url,
    viewCount: a.viewCount,
    publishedAt: a.publishedAt,
    category: a.category,
    source: a.source?.name || a.source?.nameEn || null,
  };
}

function extractKeywords(titles: string[]): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const title of titles) {
    const tokens = title
      .replace(/[^가-힣A-Za-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && t.length <= 6)
      .filter((t) => !STOPWORDS.has(t))
      .filter((t) => /[가-힣]/.test(t) || /[A-Z]{2,}/.test(t));

    const unique = new Set(tokens);
    for (const token of unique) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, KEYWORD_LIMIT);
}

export async function getTodayBriefing(): Promise<TodayBriefing> {
  const cached = await cacheService.get<TodayBriefing>(CACHE_KEY);
  if (cached) return cached;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pool = await prisma.article.findMany({
    where: { viewCount: { gt: 0 }, publishedAt: { gte: since } },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: POOL_SIZE,
    select: {
      id: true,
      title: true,
      url: true,
      viewCount: true,
      publishedAt: true,
      category: true,
      sourceType: true,
      source: { select: { name: true, nameEn: true } },
    },
  });

  const headline = pool.slice(0, HEADLINE_SIZE).map(mapArticle);

  const byCategory = (cat: string) => pool.filter((a) => a.category === cat).slice(0, SECTION_SIZE).map(mapArticle);
  const bySourceType = (st: 'RSS' | 'AI_IT') => pool.filter((a) => a.sourceType === st).slice(0, SECTION_SIZE).map(mapArticle);

  const sections: BriefingSection[] = [
    { key: 'domestic', label: '국내 경제', articles: byCategory('domestic') },
    { key: 'overseas', label: '해외 경제', articles: byCategory('overseas') },
    { key: 'ai-it', label: 'AI·IT', articles: bySourceType('AI_IT') },
  ].filter((s) => s.articles.length > 0);

  const keywords = extractKeywords(pool.slice(0, KEYWORD_SOURCE_TITLES).map((a) => a.title));

  const briefing: TodayBriefing = {
    date: new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    headline,
    sections,
    keywords,
  };

  await cacheService.set(CACHE_KEY, briefing, { ttl: CacheTTL.MINUTE_5 });
  return briefing;
}

export async function invalidateBriefingCache(): Promise<void> {
  try {
    await cacheService.delete(CACHE_KEY);
  } catch (error) {
    log.warn('Failed to invalidate briefing cache:', error);
  }
}
