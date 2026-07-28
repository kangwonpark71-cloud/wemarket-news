/**
 * Yahoo Finance Service — Free real-time Korean stock data
 * No API key required. Used as fallback when KIS credentials are not configured.
 *
 * Korean stock symbols: 005930.KS (KOSPI), 247540.KQ (KOSDAQ)
 *
 * @deprecated Use stock-service.ts directly instead.
 * This file is maintained for backward compatibility and re-exports
 * from the new independent stock-service module.
 *
 * The original implementation was imported directly by financial-service.ts
 * creating tight coupling. The new stock-service.ts contains the Yahoo
 * fallback logic internally with no cross-module dependencies.
 */

export {
  YahooFinanceClient as YahooFinanceService,
} from './stock-service';

// Re-export a singleton instance for backward compatibility
import { YahooFinanceClient } from './stock-service';

export const yahooFinanceService = new YahooFinanceClient();

// Re-export types
export type {
  StockPriceData as YahooStockResult,
} from './types';
