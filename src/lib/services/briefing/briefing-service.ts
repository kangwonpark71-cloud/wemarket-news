import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { cacheService, CacheTTL } from '@/lib/services/cache/cache-service';
import { financialAggregator } from '@/lib/services/financial/aggregator';

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

export interface BriefingQuote {
  value: number;
  change: number;
  changeRate: number;
}

export interface BriefingSimpleQuote {
  price: number;
  changeRate: number;
}

export interface BriefingMarketSnapshot {
  kospi?: BriefingQuote;
  kosdaq?: BriefingQuote;
  usdKrw?: BriefingSimpleQuote;
  nasdaq?: BriefingSimpleQuote;
  sp500?: BriefingSimpleQuote;
  btc?: BriefingSimpleQuote;
  eth?: BriefingSimpleQuote;
}

export interface BriefingMover {
  code: string;
  name: string;
  market: string;
  price: number;
  changeRate: number;
}

export interface BriefingMovers {
  gainers: BriefingMover[];
  losers: BriefingMover[];
}

export interface TodayBriefing {
  date: string;
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  overview?: string;
  market?: BriefingMarketSnapshot;
  movers?: BriefingMovers;
  headline: BriefingArticle[];
  sections: BriefingSection[];
  keywords: { keyword: string; count: number }[];
}

const POOL_SIZE = 100;
const HEADLINE_SIZE = 8;
const SECTION_SIZE = 5;
const KEYWORD_LIMIT = 8;
const KEYWORD_SOURCE_TITLES = 50;
const MOVER_LIMIT = 5;
const MOVER_LOOKBACK_HOURS = 72;
const MARKET_TIMEOUT_MS = 5000;
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

export function extractKeywords(
  titles: string[],
  limit: number = KEYWORD_LIMIT,
): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();
  const grams = new Map<string, number>();

  for (const title of titles) {
    const tokens = title
      .replace(/[^가-힣A-Za-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && t.length <= 8)
      .filter((t) => !STOPWORDS.has(t))
      .filter((t) => /[가-힣]/.test(t) || /[A-Z]{2,}/.test(t));

    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      counts.set(token, (counts.get(token) || 0) + 1);

      if (/^[가-힣]{5,}$/.test(token)) {
        for (let n = 3; n >= 2; n--) {
          let added = false;
          for (let i = 0; i + n <= token.length; i++) {
            const gram = token.slice(i, i + n);
            if (!STOPWORDS.has(gram)) {
              grams.set(gram, (grams.get(gram) || 0) + 1);
              added = true;
              break;
            }
          }
          if (added) break;
        }
      }
    }
  }

  for (const [gram, count] of grams) {
    if (count >= 2 && !counts.has(gram)) {
      counts.set(gram, count);
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function getMarketSnapshot(): Promise<BriefingMarketSnapshot | undefined> {
  try {
    const dashboard = await withTimeout(financialAggregator.getDashboard(), MARKET_TIMEOUT_MS);
    return {
      kospi: dashboard.market.kospi,
      kosdaq: dashboard.market.kosdaq,
      usdKrw: dashboard.forex.usdKrw
        ? { price: Number(dashboard.forex.usdKrw.rate), changeRate: Number(dashboard.forex.usdKrw.changeRate) }
        : undefined,
      nasdaq: dashboard.global.nasdaq
        ? { price: Number(dashboard.global.nasdaq.price), changeRate: Number(dashboard.global.nasdaq.changeRate) }
        : undefined,
      sp500: dashboard.global.sp500
        ? { price: Number(dashboard.global.sp500.price), changeRate: Number(dashboard.global.sp500.changeRate) }
        : undefined,
      btc: dashboard.crypto.btc
        ? { price: Number(dashboard.crypto.btc.tradePrice), changeRate: Number(dashboard.crypto.btc.signedChangeRate) }
        : undefined,
      eth: dashboard.crypto.eth
        ? { price: Number(dashboard.crypto.eth.tradePrice), changeRate: Number(dashboard.crypto.eth.signedChangeRate) }
        : undefined,
    };
  } catch (error) {
    log.warn('Failed to fetch market snapshot:', error);
    return undefined;
  }
}

async function getMarketMovers(): Promise<BriefingMovers | undefined> {
  try {
    const latestTs = await prisma.stockPrice.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    if (!latestTs) return undefined;

    const since = new Date(latestTs.timestamp.getTime() - MOVER_LOOKBACK_HOURS * 60 * 60 * 1000);
    const rows = await prisma.stockPrice.findMany({
      where: { timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
      take: 3000,
      include: { stock: { select: { code: true, name: true, market: true } } },
    });

    const latest = new Map<string, BriefingMover>();
    for (const row of rows) {
      if (!latest.has(row.stockId)) {
        latest.set(row.stockId, {
          code: row.stock.code,
          name: row.stock.name,
          market: row.stock.market,
          price: Number(row.price),
          changeRate: Number(row.changeRate),
        });
      }
    }

    const movers = Array.from(latest.values());
    const gainers = movers
      .filter((m) => m.changeRate > 0)
      .sort((a, b) => b.changeRate - a.changeRate)
      .slice(0, MOVER_LIMIT);
    const losers = movers
      .filter((m) => m.changeRate < 0)
      .sort((a, b) => a.changeRate - b.changeRate)
      .slice(0, MOVER_LIMIT);

    if (gainers.length === 0 && losers.length === 0) return undefined;
    return { gainers, losers };
  } catch (error) {
    log.warn('Failed to fetch market movers:', error);
    return undefined;
  }
}

function formatSigned(rate: number): string {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

export function buildOverview(snapshot: BriefingMarketSnapshot | undefined): string | undefined {
  if (!snapshot) return undefined;

  const parts: string[] = [];
  if (snapshot.kospi) {
    parts.push(`코스피 ${snapshot.kospi.value.toLocaleString('ko-KR')} (${formatSigned(snapshot.kospi.changeRate)})`);
  }
  if (snapshot.kosdaq) {
    parts.push(`코스닥 ${snapshot.kosdaq.value.toLocaleString('ko-KR')} (${formatSigned(snapshot.kosdaq.changeRate)})`);
  }
  if (snapshot.nasdaq) {
    parts.push(`나스닥 ${snapshot.nasdaq.price.toLocaleString('ko-KR')} (${formatSigned(snapshot.nasdaq.changeRate)})`);
  }
  if (snapshot.sp500) {
    parts.push(`S&P 500 ${snapshot.sp500.price.toLocaleString('ko-KR')} (${formatSigned(snapshot.sp500.changeRate)})`);
  }
  if (snapshot.usdKrw) {
    parts.push(`원/달러 ${snapshot.usdKrw.price.toFixed(1)}원`);
  }
  if (snapshot.btc) {
    parts.push(`비트코인 ${snapshot.btc.price.toLocaleString('ko-KR')}원 (${formatSigned(snapshot.btc.changeRate)})`);
  }
  if (snapshot.eth) {
    parts.push(`이더리움 ${snapshot.eth.price.toLocaleString('ko-KR')}원 (${formatSigned(snapshot.eth.changeRate)})`);
  }

  if (parts.length === 0) return undefined;
  return `주요 시장을 보면 ${parts.join(', ')}를 기록하고 있습니다.`;
}

export async function getTodayBriefing(): Promise<TodayBriefing> {
  const cached = await cacheService.get<TodayBriefing>(CACHE_KEY);
  if (cached) return cached;

  const periodTo = new Date();
  const periodFrom = new Date(periodTo.getTime() - 24 * 60 * 60 * 1000);

  const pool = await prisma.article.findMany({
    where: { viewCount: { gt: 0 }, publishedAt: { gte: periodFrom } },
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

  const [market, movers] = await Promise.all([getMarketSnapshot(), getMarketMovers()]);

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
    date: periodTo.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    generatedAt: periodTo.toISOString(),
    periodFrom: periodFrom.toISOString(),
    periodTo: periodTo.toISOString(),
    overview: buildOverview(market),
    market,
    movers,
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
