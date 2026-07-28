/**
 * Financial Service - Korea Investment Open API Client
 * Korean Stock Market Data Provider
 *
 * @deprecated Use stock-service.ts directly instead.
 * This file is maintained for backward compatibility and re-exports
 * from the new independent stock-service module.
 *
 * The original implementation had tight coupling with yahoo-finance-service.ts
 * (direct import for fallback). The new stock-service.ts uses a strategy pattern
 * (KIS → Yahoo → Mock) with no cross-module dependencies.
 */

export {
  StockService as KoreaInvestmentService,
  stockService as koreaInvestmentService,
  KoreaInvestmentClient,
  YahooFinanceClient,
} from './stock-service';

// Re-export types for backward compatibility
export type {
  StockPriceData,
  StockMasterData,
  MarketOverview,
  StockMarket,
} from './types';
