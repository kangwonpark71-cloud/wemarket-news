/**
 * Financial Service - Korea Investment Open API Client
 * Korean Stock Market Data Provider
 */

import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

interface KoreaInvestmentConfig {
  appKey: string;
  appSecret: string;
  isMock: boolean;
}

interface StockPriceData {
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

interface StockMasterData {
  code: string;
  name: string;
  market: string;
  sector?: string;
  industry?: string;
  listingDate?: Date;
}

export class KoreaInvestmentService {
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

  /**
   * Get access token for API authentication
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const cacheKey = 'korea_investment:access_token';
    const cached = await cacheService.get<{ token: string; expiresAt: number }>(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      this.accessToken = cached.token;
      this.tokenExpiresAt = cached.expiresAt;
      return this.accessToken!;
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

      await cacheService.set('korea_investment:access_token', {
        token: this.accessToken,
        expiresAt: this.tokenExpiresAt,
      }, { ttl: data.expires_in - 120 });

      return this.accessToken!;
    }

    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  /**
   * Get headers for API requests
   */
  private async getHeaders(trId: string): Promise<Record<string, string>> {
    await this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr_id': trId,
      'custtype': 'P',
    };
  }

  /**
   * Get stock current price (domestic stock)
   * TR_ID: FHKST01010100 (실시간 현재가)
   */
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
      console.error(`[KoreaInvestment] Failed to get price for ${code}:`, data.msg1);
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

  /**
   * Get multiple stock prices at once
   * TR_ID: FHKST01010200 (실시간 현재가 다중)
   */
  async getStockPrices(codes: string[]): Promise<Map<string, StockPriceData>> {
    const result = new Map<string, StockPriceData>();
    const uncachedCodes: string[] = [];

    // Check cache first
    for (const code of codes) {
      const cached = await cacheService.get<StockPriceData>(CacheKeys.stockPrice(code));
      if (cached) {
        result.set(code, cached);
      } else {
        uncachedCodes.push(code);
      }
    }

    if (uncachedCodes.length === 0) return result;

    // API allows max 30 codes per request
    const chunks = [];
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
            { ttl: CacheTTL.MINUTE }
          );
        }
      }
    }

    return result;
  }

  /**
   * Get stock master data (KOSPI/KOSDAQ listed stocks)
   */
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
      console.error('[KoreaInvestment] Failed to get stock master:', data.msg1);
      return [];
    }

const stocks: StockMasterData[] = data.output.map((item: any) => ({
      code: item.mksc_shrn_iscd,
      name: item.hts_kor_isnm,
      market: item.mrkt_cls_cd === 'K' ? 'KOSPI' : 'KOSDAQ',
      sector: item.secs_cls_cd || undefined,
      industry: item.induty_cls_cd || undefined,
      listingDate: item.lstn_dt ? new Date(item.lstn_dt) : undefined
    }));

    await cacheService.set(cacheKey, stocks, { ttl: CacheTTL.DAY });
    return stocks;
  }

  /**
   * Get market overview (KOSPI/KOSDAQ indices)
   */
  async getMarketOverview(): Promise<{
    kospi: { value: number; change: number; changeRate: number };
    kosdaq: { value: number; change: number; changeRate: number };
  }> {
    const cacheKey = 'market:overview';
    const cached = await cacheService.get<{
      kospi: { value: number; change: number; changeRate: number };
      kosdaq: { value: number; change: number; changeRate: number };
    }>(cacheKey);
    if (cached) return cached;

    // Get KOSPI (001) and KOSDAQ (101) indices
    const indices = await this.getStockPrices(['001', '101']);
    
    const result = {
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

  /**
   * Save stock prices to database
   */
  async saveStockPricesToDb(prices: StockPriceData[]): Promise<void> {
    for (const price of prices) {
      await prisma.stockPrice.create({
        data: {
          stockId: price.code, // This would need proper stock ID mapping
          price: price.price,
          change: price.change,
          changeRate: price.changeRate,
          openPrice: price.openPrice,
          highPrice: price.highPrice,
          lowPrice: price.lowPrice,
          volume: price.volume,
          tradingValue: price.tradingValue,
          marketCap: price.marketCap,
          timestamp: price.timestamp,
        },
      });
    }
  }

  /**
   * Sync stock master data to database
   */
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
    
    console.log(`[KoreaInvestment] Synced ${stocks.length} stocks to database`);
  }

  /**
   * Get top gainers for a market
   */
  async getTopGainers(market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL', limit: number = 10): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter(s => s.market === market);
    const codes = marketStocks.map(s => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);
    
    return Array.from(prices.values())
      .filter(p => p.changeRate && p.changeRate > 0)
      .sort((a, b) => (b.changeRate || 0) - (a.changeRate || 0))
      .slice(0, limit);
  }

  /**
   * Get top losers for a market
   */
  async getTopLosers(market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL', limit: number = 10): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter(s => s.market === market);
    const codes = marketStocks.map(s => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);
    
    return Array.from(prices.values())
      .filter(p => p.changeRate && p.changeRate < 0)
      .sort((a, b) => (a.changeRate || 0) - (b.changeRate || 0))
      .slice(0, limit);
  }

  /**
   * Get top volume stocks for a market
   */
  async getTopVolume(market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL', limit: number = 10): Promise<StockPriceData[]> {
    const stocks = await this.getStockMaster();
    const marketStocks = market === 'ALL' ? stocks : stocks.filter(s => s.market === market);
    const codes = marketStocks.map(s => s.code).slice(0, 200);
    const prices = await this.getStockPrices(codes);
    
    return Array.from(prices.values())
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, limit);
  }
}

export const koreaInvestmentService = new KoreaInvestmentService();