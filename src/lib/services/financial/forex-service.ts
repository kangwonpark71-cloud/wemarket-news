/**
 * Forex Service - 독립적 외환 데이터 서비스
 *
 * Manana Exchange API를 통해 원/달러, 원/엔, 원/유로, 원/위안 등
 * 주요 외환 환율을 제공합니다.
 *
 * 이 모듈은 market-service.ts에서 외환 관련 로직을 분리하여
 * 독립적으로 동작하며, 공통 타입(types.ts)만 공유합니다.
 */

import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';
import type {
  ExchangeRateData,
  ForexDailyStat,
  ProviderInfo,
  FinancialService,
} from './types';

interface MananaExchangeRateItem {
  name: string;
  rate: number | string;
}

export class ForexService implements FinancialService {
  private baseUrl = 'https://api.manana.kr/exchange/rate.json';

  getProviderInfo(): ProviderInfo {
    return { name: 'Manana Exchange', status: 'live', isSimulated: false };
  }

  async getAllExchangeRates(): Promise<ExchangeRateData[]> {
    const cacheKey = 'forex:rates:all';
    const cached = await cacheService.get<ExchangeRateData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}?base=KRW`);
      if (!response.ok) {
        console.warn(`[ForexService] Exchange rate API returned ${response.status}`);
        return [];
      }
      const text = await response.text();
      if (!text || text.trim().length === 0) return [];
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [];

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
      console.error('[ForexService] Failed to get exchange rates:', error);
      return [];
    }
  }

  async getExchangeRate(base: string, quote: string = 'KRW'): Promise<ExchangeRateData | null> {
    const cacheKey = `forex:rate:${base}:${quote}`;
    const cached = await cacheService.get<ExchangeRateData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}?base=${base}&quote=${quote}`);
      if (!response.ok) return null;
      const text = await response.text();
      if (!text || text.trim().length === 0) return null;
      const data = JSON.parse(text);

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
      console.error('[ForexService] Failed to get exchange rate:', error);
      return null;
    }
  }

  async saveExchangeRatesToDb(rates: ExchangeRateData[]): Promise<void> {
    for (const rate of rates) {
      try {
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
      } catch (error) {
        console.error(`[ForexService] Failed to save exchange rate ${rate.baseCurrency}/${rate.quoteCurrency}:`, error);
      }
    }
  }

  async getForexDailyStat(date: string): Promise<ForexDailyStat> {
    const cacheKey = `forex:daily:${date}`;
    const cached = await cacheService.get<ForexDailyStat>(cacheKey);
    if (cached) return cached;

    // BOK API 호출 (TODO: 실제 BOK API 연동)
    // 현재는 Mock 데이터 구조 반환
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

  async clearCache(): Promise<void> {
    await cacheService.deleteByPattern('forex:*');
  }
}

export const forexService = new ForexService();
