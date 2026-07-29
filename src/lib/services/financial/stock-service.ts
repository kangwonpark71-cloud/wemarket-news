/**
 * Stock Service - 독립적 주식 데이터 서비스
 *
 * 한국투자증권 Open API와 Yahoo Finance를 전략 패턴으로 통합합니다.
 * KIS 자격 증명이 없으면 Yahoo Finance로 자동 폴백하며,
 * 둘 다 실패 시 Mock 데이터를 반환합니다.
 *
 * 이 모듈은 financial-service.ts와 yahoo-finance-service.ts에서
 * 분리되어 독립적으로 동작하며, 공통 타입(types.ts)만 공유합니다.
 */

import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';
import type {
  StockPriceData,
  StockMasterData,
  MarketOverview,
  StockMarket,
  ProviderInfo,
  FinancialService,
} from './types';

import { createLogger } from '@/lib/logger';;

const log = createLogger('StockService');

// ============================================================================
// Korea Investment Open API Client
// ============================================================================

interface KoreaInvestmentConfig {
  appKey: string;
  appSecret: string;
  isMock: boolean;
}

interface KoreaInvestmentStockMasterItem {
  mksc_shrn_iscd: string;
  hts_kor_isnm: string;
  mrkt_cls_cd: string;
  secs_cls_cd?: string;
  induty_cls_cd?: string;
  lstn_dt?: string;
}

export class KoreaInvestmentClient {
  private config: KoreaInvestmentConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.config = {
      appKey: process.env.KOREA_INVEST_APP_KEY || '',
      appSecret: process.env.KOREA_INVEST_APP_SECRET || '',
      isMock: process.env.KOREA_INVEST_IS_MOCK === 'true',
    };
    this.baseUrl = this.config.isMock
      ? 'https://openapivts.koreainvestment.com:29443'
      : 'https://openapi.koreainvestment.com:9443';
  }

  isConfigured(): boolean {
    return !!this.config.appKey && !!this.config.appSecret && this.config.appKey !== 'placeholder';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const cacheKey = 'korea_investment:access_token';
    const cached = await cacheService.get<{ token: string; expiresAt: number }>(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      this.accessToken = cached.token;
      this.tokenExpiresAt = cached.expiresAt;
      return this.accessToken;
    }

    const url = `${this.baseUrl}/oauth2/tokenP`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: this.config.appKey,
        appsecret: this.config.appSecret,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

      await cacheService.set(
        'korea_investment:access_token',
        { token: this.accessToken, expiresAt: this.tokenExpiresAt },
        { ttl: data.expires_in - 120 },
      );

      return this.accessToken!;
    }

    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  private async getHeaders(trId: string): Promise<Record<string, string>> {
    await this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      appkey: this.config.appKey,
      appsecret: this.config.appSecret,
      tr_id: trId,
      custtype: 'P',
    };
  }

  getMockOverview(): MarketOverview {
    return {
      kospi: { value: 2620.5 + Math.sin(Date.now() / 10000) * 10, change: 12.45, changeRate: 0.48 },
      kosdaq: { value: 845.2 + Math.cos(Date.now() / 10000) * 4, change: -2.15, changeRate: -0.25 },
    };
  }

  getMockStockMaster(): StockMasterData[] {
    return [
      { code: '005930', name: '삼성전자', market: 'KOSPI', sector: '전기전자', industry: '반도체' },
      { code: '000660', name: 'SK하이닉스', market: 'KOSPI', sector: '전기전자', industry: '반도체' },
      { code: '373220', name: 'LG에너지솔루션', market: 'KOSPI', sector: '화학', industry: '배터리' },
      { code: '005380', name: '현대차', market: 'KOSPI', sector: '운수장비', industry: '자동차' },
      { code: '068270', name: '셀트리온', market: 'KOSPI', sector: '의약품', industry: '바이오' },
      { code: '035420', name: 'NAVER', market: 'KOSPI', sector: '서비스업', industry: 'IT' },
      { code: '035720', name: '카카오', market: 'KOSPI', sector: '서비스업', industry: 'IT' },
      { code: '247540', name: '에코프로비엠', market: 'KOSDAQ', sector: '일반전기전자', industry: '배터리소재' },
    ];
  }

  getMockStockPrice(code: string): StockPriceData {
    const mockStocks: Record<string, { name: string; basePrice: number }> = {
      '005930': { name: '삼성전자', basePrice: 78500 },
      '000660': { name: 'SK하이닉스', basePrice: 185000 },
      '373220': { name: 'LG에너지솔루션', basePrice: 382000 },
      '005380': { name: '현대차', basePrice: 245000 },
      '068270': { name: '셀트리온', basePrice: 195000 },
      '035420': { name: 'NAVER', basePrice: 182000 },
      '035720': { name: '카카오', basePrice: 48500 },
      '247540': { name: '에코프로비엠', basePrice: 215000 },
    };

    const s = mockStocks[code] || { name: '가상종목', basePrice: 50000 };
    const variation = Math.sin(Date.now() / 5000) * (s.basePrice * 0.015);
    const price = Math.round(s.basePrice + variation);
    const change = Math.round(price - s.basePrice);
    const changeRate = (change / s.basePrice) * 100;

    return {
      code,
      name: s.name,
      price,
      change,
      changeRate,
      openPrice: s.basePrice,
      highPrice: Math.round(s.basePrice * 1.02),
      lowPrice: Math.round(s.basePrice * 0.98),
      volume: 1500000 + Math.round(Math.random() * 500000),
      tradingValue: 120000000000,
      timestamp: new Date(),
    };
  }

  async getStockPrice(code: string): Promise<StockPriceData | null> {
    const cacheKey = CacheKeys.stockPrice(code);
    const cached = await cacheService.get<StockPriceData>(cacheKey);
    if (cached) return cached;

    const trId = this.config.isMock ? 'VTTS3001R' : 'FHKST01010100';
    const url = `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`;

    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: code,
    });

    const headers = await this.getHeaders(trId);
    const response = await fetch(`${url}?${params}`, { headers });
    const data = await response.json();

    if (data.rt_cd !== '0') {
      log.error(`[KoreaInvestment] Failed to get price for ${code}:`, data.msg1);
      return null;
    }

    const output = data.output;
    const result: StockPriceData = {
      code,
      name: output.hts_kor_isnm || '',
      price: parseFloat(output.stck_prpr),
      change: parseFloat(output.prdy_vrss),
      changeRate: parseFloat(output.prdy_ctrt),
      openPrice: parseFloat(output.stck_oprc),
      highPrice: parseFloat(output.stck_hgpr),
      lowPrice: parseFloat(output.stck_lwpr),
      volume: parseInt(output.acml_vol),
      tradingValue: parseFloat(output.acml_tr_pbmn),
      marketCap: output.hts_avls ? parseFloat(output.hts_avls) : undefined,
      timestamp: new Date(),
    };

    await cacheService.set(cacheKey, result, { ttl: CacheTTL.MINUTE });
    return result;
  }

  async getStockPrices(codes: string[]): Promise<Map<string, StockPriceData>> {
    const result = new Map<string, StockPriceData>();
    const uncachedCodes: string[] = [];

    for (const code of codes) {
      const cached = await cacheService.get<StockPriceData>(CacheKeys.stockPrice(code));
      if (cached) {
        result.set(code, cached);
      } else {
        uncachedCodes.push(code);
      }
    }

    if (uncachedCodes.length === 0) return result;

    const chunks: string[][] = [];
    for (let i = 0; i < uncachedCodes.length; i += 30) {
      chunks.push(uncachedCodes.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const trId = this.config.isMock ? 'VTTS3002R' : 'FHKST01010200';
      const url = `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;

      const params = new URLSearchParams({
        fid_cond_mrkt_div_code: 'J',
        fid_input_iscd: chunk.join(','),
      });

      const headers = await this.getHeaders(trId);
      const response = await fetch(`${url}?${params}`, { headers });
      const data = await response.json();

      if (data.rt_cd === '0' && data.output) {
        for (const item of data.output) {
          const stockData: StockPriceData = {
            code: item.mksc_shrn_iscd,
            name: item.hts_kor_isnm,
            price: parseFloat(item.stck_prpr),
            change: parseFloat(item.prdy_vrss),
            changeRate: parseFloat(item.prdy_ctrt),
            openPrice: parseFloat(item.stck_oprc),
            highPrice: parseFloat(item.stck_hgpr),
            lowPrice: parseFloat(item.stck_lwpr),
            volume: parseInt(item.acml_vol),
            tradingValue: parseFloat(item.acml_tr_pbmn),
            timestamp: new Date(),
          };
          result.set(stockData.code, stockData);

          await cacheService.set(
            CacheKeys.stockPrice(stockData.code),
            stockData,
            { ttl: CacheTTL.MINUTE },
          );
        }
      }
    }

    return result;
  }

  async getStockMaster(): Promise<StockMasterData[]> {
    const cacheKey = CacheKeys.stockMaster();
    const cached = await cacheService.get<StockMasterData[]>(cacheKey);
    if (cached) return cached;

    const trId = this.config.isMock ? 'VTTS3003R' : 'CTPF1002R';
    const url = `${this.baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`;

    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: '0000',
    });

    const headers = await this.getHeaders(trId);
    const response = await fetch(`${url}?${params}`, { headers });
    const data = await response.json();

    if (data.rt_cd !== '0' || !data.output) {
      log.error('[KoreaInvestment] Failed to get stock master:', data.msg1);
      return [];
    }

    const stocks: StockMasterData[] = data.output.map((item: KoreaInvestmentStockMasterItem) => ({
      code: item.mksc_shrn_iscd,
      name: item.hts_kor_isnm,
      market: item.mrkt_cls_cd === 'K' ? 'KOSPI' : 'KOSDAQ',
      sector: item.secs_cls_cd || undefined,
      industry: item.induty_cls_cd || undefined,
      listingDate: item.lstn_dt ? new Date(item.lstn_dt) : undefined,
    }));

    await cacheService.set(cacheKey, stocks, { ttl: CacheTTL.DAY });
    return stocks;
  }

  async getMarketOverview(): Promise<MarketOverview> {
    const cacheKey = 'market:overview';
    const cached = await cacheService.get<MarketOverview>(cacheKey);
    if (cached) return cached;

    const indices = await this.getStockPrices(['001', '101']);

    const result: MarketOverview = {
      kospi: { value: 0, change: 0, changeRate: 0 },
      kosdaq: { value: 0, change: 0, changeRate: 0 },
    };

    const kospi = indices.get('001');
    const kosdaq = indices.get('101');

    if (kospi) {
      result.kospi = {
        value: kospi.price,
        change: kospi.change,
        changeRate: kospi.changeRate,
      };
    }
    if (kosdaq) {
      result.kosdaq = {
        value: kosdaq.price,
        change: kosdaq.change,
        changeRate: kosdaq.changeRate,
      };
    }

    await cacheService.set(cacheKey, result, { ttl: CacheTTL.MINUTE });
    return result;
  }
}

// ============================================================================
// Yahoo Finance Client (Fallback)
// ============================================================================

const STOCK_NAMES: Record<string, string> = {
  '005930': '삼성전자', '000660': 'SK하이닉스', '373220': 'LG에너지솔루션',
  '005380': '현대차', '068270': '셀트리온', '035420': 'NAVER',
  '035720': '카카오', '247540': '에코프로비엠',
  '000270': '기아', '005490': 'POSCO홀딩스', '028260': '삼성물산',
  '055550': '신한지주', '012330': '현대모비스', '000810': '삼성화재',
  '006400': '삼성SDI', '105560': 'KB금융', '032640': 'LG전자',
  '051910': 'LG화학', '326030': 'JW중앙제약', '018260': '삼성에스디에스',
  '207940': '삼성바이오로직스', '009830': '한화솔루션', '090430': '아모레퍼시픽',
  '036570': '엔씨소프트', '122870': '우리금융지주', '008560': '메리츠금융지주',
  '010130': '고려아연', '251270': '넷마블', '066570': 'LG',
};

const STOCK_MARKETS: Record<string, string> = {
  '005930': 'KOSPI', '000660': 'KOSPI', '373220': 'KOSPI',
  '005380': 'KOSPI', '068270': 'KOSPI', '035420': 'KOSPI',
  '035720': 'KOSPI', '247540': 'KOSDAQ',
  '000270': 'KOSPI', '005490': 'KOSPI', '028260': 'KOSPI',
  '055550': 'KOSPI', '012330': 'KOSPI', '000810': 'KOSPI',
  '006400': 'KOSPI', '105560': 'KOSPI', '032640': 'KOSPI',
  '051910': 'KOSPI', '326030': 'KOSDAQ', '018260': 'KOSPI',
  '207940': 'KOSPI', '009830': 'KOSPI', '090430': 'KOSPI',
  '036570': 'KOSPI', '122870': 'KOSPI', '008560': 'KOSPI',
  '010130': 'KOSPI', '251270': 'KOSPI', '066570': 'KOSPI',
};

function toYahooSymbol(code: string): string {
  const market = STOCK_MARKETS[code] || 'KOSPI';
  return `${code}.${market === 'KOSDAQ' ? 'KQ' : 'KS'}`;
}

export class YahooFinanceClient {
  async getStockPrice(code: string): Promise<StockPriceData | null> {
    const cacheKey = `yahoo:price:${code}`;
    const cached = await cacheService.get<StockPriceData>(cacheKey);
    if (cached) return cached;

    try {
      const yahooSymbol = toYahooSymbol(code);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        log.warn(`[YahooFinance] HTTP ${response.status} for ${yahooSymbol}`);
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

      const quote: StockPriceData = {
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
      log.warn(`[YahooFinance] Failed for ${code}:`, error);
      return null;
    }
  }

  async getStockPrices(codes: string[]): Promise<Map<string, StockPriceData>> {
    const result = new Map<string, StockPriceData>();
    const uncached: string[] = [];

    for (const code of codes) {
      const cached = await cacheService.get<StockPriceData>(`yahoo:price:${code}`);
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

  async getStockMaster(): Promise<StockMasterData[]> {
    return Object.entries(STOCK_NAMES).map(([code, name]) => ({
      code,
      name,
      market: STOCK_MARKETS[code] || 'KOSPI',
    }));
  }
}

// ============================================================================
// Stock Service (Strategy Pattern: KIS → Yahoo → Mock)
// ============================================================================

export class StockService implements FinancialService {
  private kisClient: KoreaInvestmentClient;
  private yahooClient: YahooFinanceClient;
  private useYahooFallback: boolean;
  private isFallbackMock = false;

  constructor() {
    this.kisClient = new KoreaInvestmentClient();
    this.yahooClient = new YahooFinanceClient();
    this.useYahooFallback = !this.kisClient.isConfigured();
  }

  getProviderInfo(): ProviderInfo {
    if (this.useYahooFallback) {
      return { name: 'Yahoo Finance (Fallback)', status: 'yahoo_fallback', isSimulated: this.isFallbackMock };
    }
    return { name: 'Korea Investment', status: 'live', isSimulated: false };
  }

  get isSimulated(): boolean {
    return this.isFallbackMock;
  }

  async getStockPrice(code: string): Promise<StockPriceData | null> {
    if (this.useYahooFallback) {
      const yahooResult = await this.yahooClient.getStockPrice(code);
      if (yahooResult) {
        this.isFallbackMock = false;
        return yahooResult;
      }
      this.isFallbackMock = true;
      return this.kisClient.getMockStockPrice(code);
    }

    return this.kisClient.getStockPrice(code);
  }

  async getStockPrices(codes: string[]): Promise<Map<string, StockPriceData>> {
    if (this.useYahooFallback) {
      const yahooResult = await this.yahooClient.getStockPrices(codes);
      if (yahooResult.size > 0) {
        this.isFallbackMock = false;
        return yahooResult;
      }
      const mockResult = new Map<string, StockPriceData>();
      for (const code of codes) {
        mockResult.set(code, this.kisClient.getMockStockPrice(code));
      }
      this.isFallbackMock = true;
      return mockResult;
    }

    return this.kisClient.getStockPrices(codes);
  }

  async getStockMaster(): Promise<StockMasterData[]> {
    if (this.useYahooFallback) {
      const yahooMaster = await this.yahooClient.getStockMaster();
      if (yahooMaster.length > 0) {
        this.isFallbackMock = false;
        return yahooMaster;
      }
      this.isFallbackMock = true;
      return this.kisClient.getMockStockMaster();
    }

    return this.kisClient.getStockMaster();
  }

  async getMarketOverview(): Promise<MarketOverview> {
    if (this.isFallbackMock) {
      return { ...this.kisClient.getMockOverview(), simulated: true };
    }

    if (this.useYahooFallback) {
      const indices = await this.getStockPrices(['001', '101']);
      const result: MarketOverview = {
        kospi: { value: 0, change: 0, changeRate: 0 },
        kosdaq: { value: 0, change: 0, changeRate: 0 },
      };

      const kospi = indices.get('001');
      const kosdaq = indices.get('101');

      if (kospi) {
        result.kospi = { value: kospi.price, change: kospi.change, changeRate: kospi.changeRate };
      }
      if (kosdaq) {
        result.kosdaq = { value: kosdaq.price, change: kosdaq.change, changeRate: kosdaq.changeRate };
      }

      return result;
    }

    return this.kisClient.getMarketOverview();
  }

  async getTopGainers(
    market: StockMarket = 'ALL',
    limit: number = 10,
  ): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter((s) => s.market === market);
    const codes = marketStocks.map((s) => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);

    return Array.from(prices.values())
      .filter((p) => p.changeRate > 0)
      .sort((a, b) => b.changeRate - a.changeRate)
      .slice(0, limit);
  }

  async getTopLosers(
    market: StockMarket = 'ALL',
    limit: number = 10,
  ): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter((s) => s.market === market);
    const codes = marketStocks.map((s) => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);

    return Array.from(prices.values())
      .filter((p) => p.changeRate < 0)
      .sort((a, b) => a.changeRate - b.changeRate)
      .slice(0, limit);
  }

  async getTopVolume(
    market: StockMarket = 'ALL',
    limit: number = 10,
  ): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter((s) => s.market === market);
    const codes = marketStocks.map((s) => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);

    return Array.from(prices.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  async saveStockPricesToDb(prices: StockPriceData[]): Promise<void> {
    let saved = 0;
    let failed = 0;

    for (const price of prices) {
      try {
        if (
          price.price == null || price.change == null || price.changeRate == null ||
          price.openPrice == null || price.highPrice == null || price.lowPrice == null
        ) {
          log.warn(`[StockService] Skipping ${price.code} — missing required price fields`);
          failed++;
          continue;
        }

        const stock = await prisma.stock.upsert({
          where: { code: price.code },
          update: { name: price.name, isActive: true },
          create: {
            code: price.code,
            name: price.name,
            market: 'UNKNOWN',
            isActive: true,
          },
          select: { id: true },
        });

        await prisma.stockPrice.create({
          data: {
            stockId: stock.id,
            price: price.price,
            change: price.change,
            changeRate: price.changeRate,
            openPrice: price.openPrice,
            highPrice: price.highPrice,
            lowPrice: price.lowPrice,
            volume: Number(price.volume ?? 0),
            tradingValue: price.tradingValue ?? 0,
            marketCap: price.marketCap,
            timestamp: price.timestamp,
          },
        });
        saved++;
      } catch (error) {
        log.error(`[StockService] Failed to save price for ${price.code}:`, error);
        failed++;
      }
    }

    if (failed > 0) {
      log.warn(`[StockService] saveStockPricesToDb: ${saved} saved, ${failed} failed out of ${prices.length}`);
    }
  }

  async syncStockMasterToDb(): Promise<void> {
    const stocks = await this.getStockMaster();

    for (const stock of stocks) {
      await prisma.stock.upsert({
        where: { code: stock.code },
        update: {
          name: stock.name,
          market: stock.market,
          sector: stock.sector,
          industry: stock.industry,
          listingDate: stock.listingDate,
          isActive: true,
        },
        create: {
          code: stock.code,
          name: stock.name,
          market: stock.market,
          sector: stock.sector,
          industry: stock.industry,
          listingDate: stock.listingDate,
          isActive: true,
        },
      });
    }
  }

  async clearCache(): Promise<void> {
    await cacheService.deleteByPattern('stock:price:*');
    await cacheService.deleteByPattern('stock:master:*');
    await cacheService.delete('market:overview');
    await cacheService.deleteByPattern('yahoo:price:*');
    await cacheService.delete('korea_investment:access_token');
  }
}

export const stockService = new StockService();
