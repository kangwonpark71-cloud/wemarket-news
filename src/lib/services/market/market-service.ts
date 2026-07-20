import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

interface ExchangeRateData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  change: number;
  changeRate: number;
  source: string;
  timestamp: Date;
}

interface GlobalIndexData {
  symbol: string;
  name: string;
  nameKr?: string;
  price: number;
  change: number;
  changeRate: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  previousClose?: number;
  volume?: number;
  timestamp: Date;
}

interface MananaExchangeRateItem {
  name: string;
  rate: number | string;
}

interface ForexDailyStat {
  date: string;
  usdRate: number;
  usdChange: number;
  usdChangeRate: number;
  jpyRate: number;
  jpyChange: number;
  jpyChangeRate: number;
  eurRate: number;
  eurChange: number;
  eurChangeRate: number;
  cnyRate: number;
  cnyChange: number;
  cnyChangeRate: number;
}

export class MarketService {
  private baseUrl = 'https://api.manana.kr/exchange/rate.json';
  private finnhubBaseUrl = 'https://finnhub.io/api/v1';
  private finnhubApiKey = process.env.FINNHUB_API_KEY || '';


  async getAllExchangeRates(): Promise<ExchangeRateData[]> {
    const cacheKey = 'forex:rates:all';
    const cached = await cacheService.get<ExchangeRateData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}?base=KRW`);
      const data = await response.json();

      const rates: ExchangeRateData[] = data
        .filter((item: MananaExchangeRateItem) => item.name && item.name !== 'KRW=X')
        .map((item: MananaExchangeRateItem) => {
          const baseCurrency = item.name.replace('KRW=X', '').replace('=X', '').replace('KRW', '');
          return {
            baseCurrency: baseCurrency || 'USD',
            quoteCurrency: 'KRW',
            rate: parseFloat(String(item.rate)),
            change: 0,
            changeRate: 0,
            source: 'Manana',
            timestamp: new Date(),
          };
        });

      await cacheService.set('forex:rates:all', rates, { ttl: 300 });
      return rates;
    } catch (error) {
      console.error('[MarketService] Failed to get exchange rates:', error);
      return [];
    }
  }

  async getExchangeRate(base: string, quote: string = 'KRW'): Promise<ExchangeRateData | null> {
    const cacheKey = `forex:rate:${base}:${quote}`;
    const cached = await cacheService.get<ExchangeRateData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}?base=${base}&quote=${quote}`);
      const data = await response.json();

      if (!data || data.length === 0) return null;

      const item = data[0];
      const rate: ExchangeRateData = {
        baseCurrency: base,
        quoteCurrency: quote,
        rate: parseFloat(String(item.rate)),
        change: 0,
        changeRate: 0,
        source: 'Manana',
        timestamp: new Date(),
      };

      await cacheService.set(`forex:rate:${base}:${quote}`, rate, { ttl: 300 });
      return rate;
    } catch (error) {
      console.error('[MarketService] Failed to get exchange rate:', error);
      return null;
    }
  }

  async saveExchangeRatesToDb(rates: ExchangeRateData[]): Promise<void> {
    for (const rate of rates) {
      await prisma.exchangeRate.create({
        data: {
          baseCurrency: rate.baseCurrency,
          quoteCurrency: rate.quoteCurrency,
          rate: rate.rate,
          change: rate.change,
          changeRate: rate.changeRate,
          source: rate.source,
          timestamp: rate.timestamp,
        },
      });
    }
  }

  async getGlobalIndices(): Promise<GlobalIndexData[]> {
    const cacheKey = 'global:indices:all';
    const cached = await cacheService.get<GlobalIndexData[]>(cacheKey);
    if (cached) return cached;

    const indices: GlobalIndexData[] = [];

    if (process.env.FINNHUB_API_KEY) {
      const symbols = ['^DJI', '^IXIC', '^GSPC', '^RUT', '^VIX'];

      for (const symbol of symbols) {
        try {
          const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.c !== undefined) {
            const name = this.getIndexName(symbol);
            indices.push({
              symbol,
              name,
              nameKr: this.getIndexNameKr(symbol),
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
          console.error(`[MarketService] Failed to get ${symbol}:`, error);
        }
      }
    }

    if (indices.length > 0) {
      await cacheService.set('global:indices:all', indices, { ttl: 300 });
    } else {
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
        console.error(err);
      }
    }

    return indices;
  }

  private getIndexName(symbol: string): string {
    const names: Record<string, string> = {
      '^DJI': 'Dow Jones Industrial Average',
      '^IXIC': 'NASDAQ Composite',
      '^GSPC': 'S&P 500',
      '^RUT': 'Russell 2000',
      '^VIX': 'CBOE Volatility Index',
    };
    return names[symbol] || symbol;
  }

  private getIndexNameKr(symbol: string): string {
    const names: Record<string, string> = {
      '^DJI': '다우존스 산업평균',
      '^IXIC': '나스닥 종합',
      '^GSPC': 'S&P 500',
      '^RUT': '러셀 2000',
      '^VIX': 'VIX 변동성 지수',
    };
    return names[symbol] || symbol;
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

  async getForexDailyStat(date: string): Promise<ForexDailyStat> {
    const cacheKey = `forex:daily:${date}`;
    const cached = await cacheService.get<ForexDailyStat>(cacheKey);
    if (cached) return cached;

    // This would typically call BOK API
    // For now return mock data structure
    const result: ForexDailyStat = {
      date,
      usdRate: 1350,
      usdChange: 5,
      usdChangeRate: 0.37,
      jpyRate: 9.2,
      jpyChange: -0.1,
      jpyChangeRate: -1.07,
      eurRate: 1450,
      eurChange: 10,
      eurChangeRate: 0.69,
      cnyRate: 186,
      cnyChange: -2,
      cnyChangeRate: -1.06,
    };

    await cacheService.set(`forex:daily:${date}`, result, { ttl: 86400 });
    return result;
  }

  async getGlobalIndex(symbol: string): Promise<GlobalIndexData | null> {
    const cacheKey = `global:index:${symbol}`;
    const cached = await cacheService.get<GlobalIndexData>(cacheKey);
    if (cached) return cached;

    if (!this.finnhubApiKey) return null;

    try {
      const url = `${this.finnhubBaseUrl}/quote?symbol=${symbol}&token=${this.finnhubApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.c === undefined) return null;

      const result: GlobalIndexData = {
        symbol,
        name: this.getIndexName(symbol),
        nameKr: this.getIndexNameKr(symbol),
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
      console.error(`[MarketService] Failed to fetch ${symbol}:`, error);
      return null;
    }
  }
}

export const marketService = new MarketService();
