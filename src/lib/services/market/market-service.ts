/**
 * Market Service - Combined Forex + Global Index Data Provider
 *
 * @deprecated Use forex-service.ts and global-index-service.ts directly instead.
 * This file is maintained for backward compatibility.
 *
 * The original implementation combined FOREX and GLOBAL INDEX in a single class,
 * violating the single responsibility principle. The new architecture splits
 * these into independent services:
 * - forex-service.ts (ForexService)
 * - global-index-service.ts (GlobalIndexService)
 *
 * This wrapper delegates to both services to maintain backward compatibility
 * with existing API routes and the scheduler.
 */

import { forexService } from '@/lib/services/financial/forex-service';
import { globalIndexService } from '@/lib/services/financial/global-index-service';
import type {
  ExchangeRateData,
  GlobalIndexData,
  ForexDailyStat,
} from '@/lib/services/financial/types';

export class MarketService {
  // Delegate to ForexService
  async getAllExchangeRates(): Promise<ExchangeRateData[]> {
    return forexService.getAllExchangeRates();
  }

  async getExchangeRate(base: string, quote: string = 'KRW'): Promise<ExchangeRateData | null> {
    return forexService.getExchangeRate(base, quote);
  }

  async saveExchangeRatesToDb(rates: ExchangeRateData[]): Promise<void> {
    return forexService.saveExchangeRatesToDb(rates);
  }

  async getForexDailyStat(date: string): Promise<ForexDailyStat> {
    return forexService.getForexDailyStat(date);
  }

  // Delegate to GlobalIndexService
  async getGlobalIndices(): Promise<GlobalIndexData[]> {
    return globalIndexService.getGlobalIndices();
  }

  async getGlobalIndex(symbol: string): Promise<GlobalIndexData | null> {
    return globalIndexService.getGlobalIndex(symbol);
  }

  async saveGlobalIndicesToDb(indices: GlobalIndexData[]): Promise<void> {
    return globalIndexService.saveGlobalIndicesToDb(indices);
  }
}

export const marketService = new MarketService();
