/**
 * Global Index Service - 독립적 글로벌 지수 데이터 서비스
 *
 * Finnhub API를 통해 다우존스, 나스닥, S&P 500, 러셀 2000, VIX 등
 * 글로벌 주요 지수를 제공합니다. API 키가 없으면 DB에서 최근 데이터를 조회합니다.
 *
 * 이 모듈은 market-service.ts에서 글로벌 지수 관련 로직을 분리하여
 * 독립적으로 동작하며, 공통 타입(types.ts)만 공유합니다.
 */

import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';
import type {
  GlobalIndexData,
  ProviderInfo,
  FinancialService,
} from './types';

import { createLogger } from '@/lib/logger';

const log = createLogger('GlobalIndex');

interface FinnhubQuoteResponse {
  c: number;
  d: number;
  dp: number;
  o: number;
  h: number;
  l: number;
  pc: number;
  v: number;
}

const INDEX_NAMES: Record<string, string> = {
  '^DJI': 'Dow Jones Industrial Average',
  '^IXIC': 'NASDAQ Composite',
  '^GSPC': 'S&P 500',
  '^RUT': 'Russell 2000',
  '^VIX': 'CBOE Volatility Index',
};

const INDEX_NAMES_KR: Record<string, string> = {
  '^DJI': '다우존스 산업평균',
  '^IXIC': '나스닥 종합',
  '^GSPC': 'S&P 500',
  '^RUT': '러셀 2000',
  '^VIX': 'VIX 변동성 지수',
};

const DEFAULT_SYMBOLS = ['^DJI', '^IXIC', '^GSPC', '^RUT', '^VIX'];

export class GlobalIndexService implements FinancialService {
  private finnhubBaseUrl = 'https://finnhub.io/api/v1';
  private finnhubApiKey = process.env.FINNHUB_API_KEY || '';

  getProviderInfo(): ProviderInfo {
    return {
      name: this.finnhubApiKey ? 'Finnhub' : 'Database (Fallback)',
      status: this.finnhubApiKey ? 'live' : 'mock',
      isSimulated: !this.finnhubApiKey,
    };
  }

  async getGlobalIndices(): Promise<GlobalIndexData[]> {
    const cacheKey = 'global:indices:all';
    const cached = await cacheService.get<GlobalIndexData[]>(cacheKey);
    if (cached) return cached;

    const indices: GlobalIndexData[] = [];

    if (this.finnhubApiKey) {
      for (const symbol of DEFAULT_SYMBOLS) {
        try {
          const url = `${this.finnhubBaseUrl}/quote?symbol=${symbol}&token=${this.finnhubApiKey}`;
          const response = await fetch(url);
          const data: FinnhubQuoteResponse = await response.json();

          if (data.c !== undefined) {
            indices.push({
              symbol,
              name: INDEX_NAMES[symbol] || symbol,
              nameKr: INDEX_NAMES_KR[symbol],
              price: data.c,
              change: data.d,
              changeRate: data.dp,
              openPrice: data.o,
              highPrice: data.h,
              lowPrice: data.l,
              previousClose: data.pc,
              volume: data.v,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          log.error(`[GlobalIndexService] Failed to get ${symbol}:`, error);
        }
      }
    }

    if (indices.length > 0) {
      await cacheService.set('global:indices:all', indices, { ttl: 300 });
    } else {
      // DB fallback
      try {
        const dbIndices = await prisma.globalIndex.findMany({
          include: {
            quotes: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        });

        for (const idx of dbIndices) {
          const latestQuote = idx.quotes[0];
          if (latestQuote) {
            indices.push({
              symbol: idx.symbol,
              name: idx.name,
              nameKr: idx.nameKr || undefined,
              price: Number(latestQuote.price),
              change: Number(latestQuote.change),
              changeRate: Number(latestQuote.changeRate),
              openPrice: latestQuote.openPrice ? Number(latestQuote.openPrice) : undefined,
              highPrice: latestQuote.highPrice ? Number(latestQuote.highPrice) : undefined,
              lowPrice: latestQuote.lowPrice ? Number(latestQuote.lowPrice) : undefined,
              previousClose: latestQuote.previousClose ? Number(latestQuote.previousClose) : undefined,
              volume: latestQuote.volume ? Number(latestQuote.volume) : undefined,
              timestamp: latestQuote.timestamp,
            });
          }
        }
      } catch (err) {
        log.error('[GlobalIndexService] DB fallback failed:', err);
      }
    }

    return indices;
  }

  async getGlobalIndex(symbol: string): Promise<GlobalIndexData | null> {
    const cacheKey = `global:index:${symbol}`;
    const cached = await cacheService.get<GlobalIndexData>(cacheKey);
    if (cached) return cached;

    if (!this.finnhubApiKey) return null;

    try {
      const url = `${this.finnhubBaseUrl}/quote?symbol=${symbol}&token=${this.finnhubApiKey}`;
      const response = await fetch(url);
      const data: FinnhubQuoteResponse = await response.json();

      if (data.c === undefined) return null;

      const result: GlobalIndexData = {
        symbol,
        name: INDEX_NAMES[symbol] || symbol,
        nameKr: INDEX_NAMES_KR[symbol],
        price: data.c,
        change: data.d,
        changeRate: data.dp,
        openPrice: data.o,
        highPrice: data.h,
        lowPrice: data.l,
        previousClose: data.pc,
        volume: data.v,
        timestamp: new Date(),
      };

      await cacheService.set(`global:index:${symbol}`, result, { ttl: 60 });
      return result;
    } catch (error) {
      log.error(`[GlobalIndexService] Failed to fetch ${symbol}:`, error);
      return null;
    }
  }

  async saveGlobalIndicesToDb(indices: GlobalIndexData[]): Promise<void> {
    for (const index of indices) {
      const globalIndex = await prisma.globalIndex.upsert({
        where: { symbol: index.symbol },
        update: { name: index.name, nameKr: index.nameKr },
        create: {
          symbol: index.symbol,
          name: index.name,
          nameKr: index.nameKr,
          country: 'US',
          category: 'INDEX',
          isActive: true,
        },
      });

      await prisma.globalIndexQuote.create({
        data: {
          indexId: globalIndex.id,
          price: index.price,
          change: index.change,
          changeRate: index.changeRate,
          openPrice: index.openPrice,
          highPrice: index.highPrice,
          lowPrice: index.lowPrice,
          previousClose: index.previousClose,
          volume: index.volume,
          timestamp: index.timestamp,
        },
      });
    }
  }

  async clearCache(): Promise<void> {
    await cacheService.deleteByPattern('global:*');
  }
}

export const globalIndexService = new GlobalIndexService();
