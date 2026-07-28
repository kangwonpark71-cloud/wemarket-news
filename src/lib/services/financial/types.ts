/**
 * 공통 금융 데이터 타입 정의
 *
 * 모든 금융 서비스(주식, 암호화폐, 외환, 글로벌 지수)가
 * 공유하는 인터페이스와 타입을 정의합니다.
 * 서비스 간 결합도를 최소화하기 위해 독립적인 모듈로 분리했습니다.
 */

// ============================================================================
// Market Provider Status
// ============================================================================

export type ProviderStatus = 'live' | 'mock' | 'yahoo_fallback';

export interface ProviderInfo {
  name: string;
  status: ProviderStatus;
  isSimulated: boolean;
}

// ============================================================================
// 주식 (Stock) 타입
// ============================================================================

export interface StockPriceData {
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
  marketCap?: number;
  timestamp: Date;
}

export interface StockMasterData {
  code: string;
  name: string;
  market: string;
  sector?: string;
  industry?: string;
  listingDate?: Date;
}

export interface MarketOverview {
  kospi: { value: number; change: number; changeRate: number };
  kosdaq: { value: number; change: number; changeRate: number };
  simulated?: boolean;
}

export type StockMarket = 'KOSPI' | 'KOSDAQ' | 'ALL';

// ============================================================================
// 암호화폐 (Crypto) 타입
// ============================================================================

export interface CryptoTickerData {
  symbol: string;
  name: string;
  nameKr?: string;
  tradePrice: number;
  signedChangePrice: number;
  signedChangeRate: number;
  askPrice: number;
  bidPrice: number;
  accTradePrice24h: number;
  accTradeVolume24h: number;
  highPrice24h: number;
  lowPrice24h: number;
  prevClosingPrice: number;
  timestamp: Date;
}

export interface CryptoCandleData {
  symbol: string;
  unit: string;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  tradePrice: number;
  candleAccTradeVolume: number;
  candleAccTradePrice: number;
  timestamp: Date;
}

export interface CryptoMarketInfo {
  symbol: string;
  name: string;
  nameKr?: string;
  market: string;
  isActive: boolean;
}

export type CandleUnit =
  | 'minutes/1'
  | 'minutes/5'
  | 'minutes/15'
  | 'minutes/30'
  | 'minutes/60'
  | 'days'
  | 'weeks'
  | 'months';

// ============================================================================
// 외환 (Forex) 타입
// ============================================================================

export interface ExchangeRateData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  change: number;
  changeRate: number;
  source: string;
  timestamp: Date;
}

export interface ForexDailyStat {
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

// ============================================================================
// 글로벌 지수 (Global Index) 타입
// ============================================================================

export interface GlobalIndexData {
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

// ============================================================================
// 통합 대시보드 타입
// ============================================================================

export interface FinancialDashboard {
  market: {
    kospi: { value: number; change: number; changeRate: number };
    kosdaq: { value: number; change: number; changeRate: number };
  };
  crypto: {
    btc?: CryptoTickerData;
    eth?: CryptoTickerData;
  };
  forex: {
    usdKrw?: ExchangeRateData;
  };
  global: {
    nasdaq?: GlobalIndexData;
    sp500?: GlobalIndexData;
  };
}

// ============================================================================
// 서비스 인터페이스
// ============================================================================

/**
 * 모든 금융 서비스가 구현해야 하는 기본 인터페이스
 * 독립적인 서비스 간 결합도를 최소화하기 위해 정의
 */
export interface FinancialService {
  getProviderInfo(): ProviderInfo;
  clearCache(): Promise<void>;
}
