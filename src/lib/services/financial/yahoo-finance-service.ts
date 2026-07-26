/**
 * Yahoo Finance Service — Free real-time Korean stock data
 * No API key required. Used as fallback when KIS credentials are not configured.
 *
 * Korean stock symbols: 005930.KS (KOSPI), 247540.KQ (KOSDAQ)
 */

import { cacheService } from '@/lib/services/cache/cache-service';

interface YahooStockResult {
  code: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  tradingValue: number;
  timestamp: Date;
}

const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '373220': 'LG에너지솔루션',
  '005380': '현대차',
  '068270': '셀트리온',
  '035420': 'NAVER',
  '035720': '카카오',
  '247540': '에코프로비엠',
};

const STOCK_MARKETS: Record<string, string> = {
  '005930': 'KOSPI', '000660': 'KOSPI', '373220': 'KOSPI',
  '005380': 'KOSPI', '068270': 'KOSPI', '035420': 'KOSPI',
  '035720': 'KOSPI', '247540': 'KOSDAQ',
};

function toYahooSymbol(code: string): string {
  const market = STOCK_MARKETS[code] || 'KOSPI';
  return `${code}.${market === 'KOSDAQ' ? 'KQ' : 'KS'}`;
}

export class YahooFinanceService {
  async getStockPrice(code: string): Promise<YahooStockResult | null> {
    const cacheKey = `yahoo:price:${code}`;
    const cached = await cacheService.get<YahooStockResult>(cacheKey);
    if (cached) return cached;

    try {
      const yahooSymbol = toYahooSymbol(code);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[YahooFinance] HTTP ${response.status} for ${yahooSymbol}`);
        return null;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose;
      const change = price - prevClose;
      const changeRate = prevClose > 0 ? (change / prevClose) * 100 : 0;

      const quote: YahooStockResult = {
        code,
        name: STOCK_NAMES[code] || meta.shortName || code,
        price: Math.round(price * (price < 100000 ? 10 : 1)) / (price < 100000 ? 10 : 1),
        change: Math.round(change * 10) / 10,
        changeRate: Math.round(changeRate * 100) / 100,
        openPrice: meta.regularMarketOpen || price,
        highPrice: meta.regularMarketDayHigh || price,
        lowPrice: meta.regularMarketDayLow || price,
        volume: meta.regularMarketVolume || 0,
        tradingValue: (meta.regularMarketVolume || 0) * price,
        timestamp: new Date(),
      };

      await cacheService.set(cacheKey, quote, { ttl: 60 });
      return quote;
    } catch (error) {
      console.warn(`[YahooFinance] Failed for ${code}:`, error);
      return null;
    }
  }

  async getStockPrices(codes: string[]): Promise<Map<string, YahooStockResult>> {
    const result = new Map<string, YahooStockResult>();
    const uncached: string[] = [];

    for (const code of codes) {
      const cached = await cacheService.get<YahooStockResult>(`yahoo:price:${code}`);
      if (cached) {
        result.set(code, cached);
      } else {
        uncached.push(code);
      }
    }

    await Promise.all(
      uncached.map(async (code) => {
        const quote = await this.getStockPrice(code);
        if (quote) result.set(code, quote);
      }),
    );

    return result;
  }

  async getStockMaster(): Promise<{ code: string; name: string; market: string }[]> {
    return Object.entries(STOCK_NAMES).map(([code, name]) => ({
      code,
      name,
      market: STOCK_MARKETS[code] || 'KOSPI',
    }));
  }
}

export const yahooFinanceService = new YahooFinanceService();
