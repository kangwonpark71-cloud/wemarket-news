/**
 * Financial Aggregator - 통합 금융 데이터 집계기
 *
 * 모든 금융 서비스(stock, forex, global-index, crypto)를 하나의 인터페이스로
 * 통합하여 API 라우트와 스케줄러가 단일 진입점만 사용할 수 있도록 합니다.
 *
 * 각 서비스는 독립적인 모듈로 분리되어 있어 결합도가 없습니다.
 * 집계기는 단지 이들을 조합하여 제공할 뿐입니다.
 */

import { stockService, StockService } from './stock-service';
import { forexService, ForexService } from './forex-service';
import { globalIndexService, GlobalIndexService } from './global-index-service';
import { upbitService, UpbitService } from '@/lib/services/crypto/crypto-service';
import type {
  MarketOverview,
  ExchangeRateData,
  GlobalIndexData,
  FinancialDashboard,
  ProviderInfo,
} from './types';

export class FinancialAggregator {
  constructor(
    public readonly stock: StockService = stockService,
    public readonly forex: ForexService = forexService,
    public readonly global: GlobalIndexService = globalIndexService,
    public readonly crypto: UpbitService = upbitService,
  ) {}

  /**
   * 모든 서비스의 제공자 정보를 반환
   */
  getProviderInfo(): ProviderInfo[] {
    return [
      this.stock.getProviderInfo(),
      this.forex.getProviderInfo(),
      this.global.getProviderInfo(),
      { name: 'Upbit', status: 'live', isSimulated: false },
    ];
  }

  /**
   * 대시보드용 통합 데이터 (KOSPI/KOSDAQ/BTC/ETH/USD/NASDAQ)
   * API 라우트 /api/financial/dashboard에서 사용
   */
  async getDashboard(): Promise<FinancialDashboard> {
    const [marketOverview, tickers, exchangeRates, globalIndices] = await Promise.all([
      this.stock.getMarketOverview(),
      this.crypto.getAllTickers(),
      this.forex.getAllExchangeRates(),
      this.global.getGlobalIndices(),
    ]);

    const btc = tickers.find((t) => t.symbol === 'BTC') || undefined;
    const eth = tickers.find((t) => t.symbol === 'ETH') || undefined;
    const usdKrw = exchangeRates.find((r) => r.baseCurrency === 'USD') || undefined;
    const nasdaq = globalIndices.find((g) => g.symbol === '^IXIC') || undefined;
    const sp500 = globalIndices.find((g) => g.symbol === '^GSPC') || undefined;

    return {
      market: {
        kospi: marketOverview.kospi,
        kosdaq: marketOverview.kosdaq,
      },
      crypto: {
        btc: btc
          ? {
              symbol: btc.symbol,
              name: btc.name,
              nameKr: btc.nameKr,
              tradePrice: btc.tradePrice,
              signedChangePrice: btc.signedChangePrice,
              signedChangeRate: btc.signedChangeRate,
              askPrice: btc.askPrice,
              bidPrice: btc.bidPrice,
              accTradePrice24h: btc.accTradePrice24h,
              accTradeVolume24h: btc.accTradeVolume24h,
              highPrice24h: btc.highPrice24h,
              lowPrice24h: btc.lowPrice24h,
              prevClosingPrice: btc.prevClosingPrice,
              timestamp: btc.timestamp,
            }
          : undefined,
        eth: eth
          ? {
              symbol: eth.symbol,
              name: eth.name,
              nameKr: eth.nameKr,
              tradePrice: eth.tradePrice,
              signedChangePrice: eth.signedChangePrice,
              signedChangeRate: eth.signedChangeRate,
              askPrice: eth.askPrice,
              bidPrice: eth.bidPrice,
              accTradePrice24h: eth.accTradePrice24h,
              accTradeVolume24h: eth.accTradeVolume24h,
              highPrice24h: eth.highPrice24h,
              lowPrice24h: eth.lowPrice24h,
              prevClosingPrice: eth.prevClosingPrice,
              timestamp: eth.timestamp,
            }
          : undefined,
      },
      forex: {
        usdKrw: usdKrw
          ? {
              baseCurrency: usdKrw.baseCurrency,
              quoteCurrency: usdKrw.quoteCurrency,
              rate: usdKrw.rate,
              change: usdKrw.change,
              changeRate: usdKrw.changeRate,
              source: usdKrw.source,
              timestamp: usdKrw.timestamp,
            }
          : undefined,
      },
      global: {
        nasdaq: nasdaq
          ? {
              symbol: nasdaq.symbol,
              name: nasdaq.name,
              nameKr: nasdaq.nameKr,
              price: nasdaq.price,
              change: nasdaq.change,
              changeRate: nasdaq.changeRate,
              openPrice: nasdaq.openPrice,
              highPrice: nasdaq.highPrice,
              lowPrice: nasdaq.lowPrice,
              previousClose: nasdaq.previousClose,
              volume: nasdaq.volume,
              timestamp: nasdaq.timestamp,
            }
          : undefined,
        sp500: sp500
          ? {
              symbol: sp500.symbol,
              name: sp500.name,
              nameKr: sp500.nameKr,
              price: sp500.price,
              change: sp500.change,
              changeRate: sp500.changeRate,
              openPrice: sp500.openPrice,
              highPrice: sp500.highPrice,
              lowPrice: sp500.lowPrice,
              previousClose: sp500.previousClose,
              volume: sp500.volume,
              timestamp: sp500.timestamp,
            }
          : undefined,
      },
    };
  }

  /**
   * 전체 시장 개요 (KOSPI/KOSDAQ + 외환 + 글로벌 지수 통계)
   * API 라우트 /api/financial/overview에서 사용
   */
  async getOverview(): Promise<{
    market: MarketOverview;
    forex: ExchangeRateData[];
    globalIndices: GlobalIndexData[];
    isSimulated: boolean;
  }> {
    const [market, forex, globalIndices] = await Promise.all([
      this.stock.getMarketOverview(),
      this.forex.getAllExchangeRates(),
      this.global.getGlobalIndices(),
    ]);

    const stockProvider = this.stock.getProviderInfo();
    const isSimulated = stockProvider.status === 'mock' || stockProvider.status === 'yahoo_fallback';

    return {
      market,
      forex,
      globalIndices,
      isSimulated,
    };
  }

  /**
   * 모든 캐시 초기화
   */
  async clearAllCaches(): Promise<void> {
    await Promise.all([
      this.stock.clearCache(),
      this.forex.clearCache(),
      this.global.clearCache(),
    ]);
  }
}

export const financialAggregator = new FinancialAggregator();

// Re-export types for convenience
export type {
  StockPriceData,
  StockMasterData,
  MarketOverview,
  ExchangeRateData,
  GlobalIndexData,
  CryptoTickerData,
  FinancialDashboard,
  ProviderInfo,
} from './types';
