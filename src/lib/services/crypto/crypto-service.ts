import { cacheService, CacheKeys } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

import { createLogger } from '@/lib/logger';
const log = createLogger('CryptoService')

interface UpbitConfig {
  baseUrl: string;
  accessKey?: string;
  secretKey?: string;
}

interface CryptoTickerData {
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

interface CryptoCandleData {
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

interface CryptoMarketInfo {
  symbol: string;
  name: string;
  nameKr?: string;
  market: string;
  isActive: boolean;
}

interface UpbitMarketItem {
  market: string;
  english_name: string;
  korean_name: string;
}

interface UpbitTickerItem {
  market: string;
  trade_price: number;
  signed_change_price: number;
  signed_change_rate: number;
  ask_price: number;
  bid_price: number;
  acc_trade_price_24h: number;
  acc_trade_volume_24h: number;
  high_price: number;
  low_price: number;
  prev_closing_price: number;
  timestamp: number;
}

interface UpbitCandleItem {
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  candle_acc_trade_volume: number;
  candle_acc_trade_price: number;
  candle_date_time_kst: string;
}

export class UpbitService {
  private config: UpbitConfig;

  constructor() {
    this.config = {
      baseUrl: 'https://api.upbit.com/v1',
      accessKey: process.env.UPBIT_ACCESS_KEY,
      secretKey: process.env.UPBIT_SECRET_KEY,
    };
  }

  async getMarkets(): Promise<CryptoMarketInfo[]> {
    const cacheKey = CacheKeys.cryptoMarkets();
    const cached = await cacheService.get<CryptoMarketInfo[]>(cacheKey);
    if (cached) return cached;

    const url = `${this.config.baseUrl}/market/all?isDetails=true`;
    const response = await fetch(url);
    const data = await response.json();

    const krwMarkets = data
      .filter((market: UpbitMarketItem) => market.market.startsWith('KRW-'))
      .map((market: UpbitMarketItem) => ({
        symbol: market.market.split('-')[1],
        name: market.english_name,
        nameKr: market.korean_name,
        market: market.market,
        isActive: true,
      }));

    await cacheService.set('crypto:markets:all', krwMarkets, { ttl: 3600 });
    return krwMarkets;
  }

  async getAllTickers(): Promise<CryptoTickerData[]> {
    const cacheKey = CacheKeys.cryptoTickers();
    const cached = await cacheService.get<CryptoTickerData[]>(cacheKey);
    if (cached) return cached;

    const markets = await this.getMarkets();
    const marketCodes = markets.map(m => m.market).join(',');

    const url = `${this.config.baseUrl}/ticker?markets=${marketCodes}`;
    const response = await fetch(url);
    const data = await response.json();

    const tickers: CryptoTickerData[] = data.map((item: UpbitTickerItem) => ({
      symbol: item.market.split('-')[1],
      name: item.market.replace('KRW-', ''),
      tradePrice: item.trade_price,
      signedChangePrice: item.signed_change_price,
      signedChangeRate: item.signed_change_rate * 100,
      askPrice: item.ask_price,
      bidPrice: item.bid_price,
      accTradePrice24h: item.acc_trade_price_24h,
      accTradeVolume24h: item.acc_trade_volume_24h,
      highPrice24h: item.high_price,
      lowPrice24h: item.low_price,
      prevClosingPrice: item.prev_closing_price,
      timestamp: new Date(item.timestamp),
    }));

    tickers.sort((a, b) => b.tradePrice - a.tradePrice);

    await cacheService.set(CacheKeys.cryptoTickers(), tickers, { ttl: 60 });
    return tickers;
  }

  async getTicker(symbol: string): Promise<CryptoTickerData | null> {
    const cacheKey = CacheKeys.cryptoTicker(symbol);
    const cached = await cacheService.get<CryptoTickerData>(cacheKey);
    if (cached) return cached;

    const market = `KRW-${symbol}`;
    const url = `${this.config.baseUrl}/ticker?markets=${market}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || data.length === 0) return null;

    const item = data[0];
    const result: CryptoTickerData = {
      symbol,
      name: item.market.replace('KRW-', ''),
      tradePrice: item.trade_price,
      signedChangePrice: item.signed_change_price,
      signedChangeRate: item.signed_change_rate * 100,
      askPrice: item.ask_price,
      bidPrice: item.bid_price,
      accTradePrice24h: item.acc_trade_price_24h,
      accTradeVolume24h: item.acc_trade_volume_24h,
      highPrice24h: item.high_price,
      lowPrice24h: item.low_price,
      prevClosingPrice: item.prev_closing_price,
      timestamp: new Date(item.timestamp),
    };

    await cacheService.set(cacheKey, result, { ttl: 60 });
    return result;
  }

  async getCandles(
    symbol: string,
    unit: 'minutes/1' | 'minutes/5' | 'minutes/15' | 'minutes/30' | 'minutes/60' | 'days' | 'weeks' | 'months' = 'minutes/1',
    count: number = 200
  ): Promise<CryptoCandleData[]> {
    const cacheKey = CacheKeys.cryptoCandle(symbol, unit);
    const cached = await cacheService.get<CryptoCandleData[]>(cacheKey);
    if (cached) return cached;

    const market = `KRW-${symbol}`;
    const url = `${this.config.baseUrl}/candles/${unit}?market=${market}&count=${count}`;
    const response = await fetch(url);
    const data = await response.json();

    const candles: CryptoCandleData[] = data.map((item: UpbitCandleItem) => ({
      symbol,
      unit,
      openPrice: item.opening_price,
      highPrice: item.high_price,
      lowPrice: item.low_price,
      tradePrice: item.trade_price,
      candleAccTradeVolume: item.candle_acc_trade_volume,
      candleAccTradePrice: item.candle_acc_trade_price,
      timestamp: new Date(item.candle_date_time_kst),
    })).reverse();

    const ttl = unit.startsWith('minutes') ? 300 : 900;
    await cacheService.set(CacheKeys.cryptoCandle(symbol, unit), candles, { ttl });
    return candles;
  }

  async getTopVolume(limit: number = 20): Promise<CryptoTickerData[]> {
    const cacheKey = CacheKeys.cryptoTopVolume(limit);
    const cached = await cacheService.get<CryptoTickerData[]>(cacheKey);
    if (cached) return cached;

    const allTickers = await this.getAllTickers();
    const result = allTickers
      .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
      .slice(0, limit);

    await cacheService.set(CacheKeys.cryptoTopVolume(limit), result, { ttl: 300 });
    return result;
  }

  async getTopGainers(limit: number = 20): Promise<CryptoTickerData[]> {
    const cacheKey = CacheKeys.cryptoTopGainers(limit);
    const cached = await cacheService.get<CryptoTickerData[]>(cacheKey);
    if (cached) return cached;

    const allTickers = await this.getAllTickers();
    const result = allTickers
      .filter(t => t.signedChangeRate > 0)
      .sort((a, b) => b.signedChangeRate - a.signedChangeRate)
      .slice(0, limit);

    await cacheService.set(CacheKeys.cryptoTopGainers(limit), result, { ttl: 300 });
    return result;
  }

  async getTopLosers(limit: number = 20): Promise<CryptoTickerData[]> {
    const cacheKey = CacheKeys.cryptoTopLosers(limit);
    const cached = await cacheService.get<CryptoTickerData[]>(cacheKey);
    if (cached) return cached;

    const allTickers = await this.getAllTickers();
    const result = allTickers
      .filter(t => t.signedChangeRate < 0)
      .sort((a, b) => a.signedChangeRate - b.signedChangeRate)
      .slice(0, limit);

    await cacheService.set(CacheKeys.cryptoTopLosers(limit), result, { ttl: 300 });
    return result;
  }

  async saveTickersToDb(tickers: CryptoTickerData[]): Promise<void> {
    for (const ticker of tickers) {
      try {
        await prisma.cryptocurrency.upsert({
          where: { symbol: ticker.symbol },
          update: { name: ticker.name, nameKr: ticker.nameKr },
          create: {
            symbol: ticker.symbol,
            name: ticker.name,
            nameKr: ticker.nameKr,
            market: 'UPBIT',
            isActive: true,
          },
        });
      } catch (error) {
        log.error(`[CryptoService] Failed to upsert cryptocurrency ${ticker.symbol}:`, error);
      }
    }

    const cryptoRecords = await prisma.cryptocurrency.findMany({
      where: { symbol: { in: tickers.map(t => t.symbol) } },
    });

    const cryptoMap = new Map(cryptoRecords.map(c => [c.symbol, c.id]));

    for (const ticker of tickers) {
      const cryptoId = cryptoMap.get(ticker.symbol);
      if (!cryptoId) continue;

      try {
        await prisma.cryptoTicker.create({
          data: {
            cryptoId,
            tradePrice: ticker.tradePrice,
            signedChangePrice: ticker.signedChangePrice,
            signedChangeRate: ticker.signedChangeRate,
            askPrice: ticker.askPrice ?? ticker.tradePrice,
            bidPrice: ticker.bidPrice ?? ticker.tradePrice,
            accTradePrice24h: ticker.accTradePrice24h,
            accTradeVolume24h: ticker.accTradeVolume24h,
            highPrice24h: ticker.highPrice24h,
            lowPrice24h: ticker.lowPrice24h,
            prevClosingPrice: ticker.prevClosingPrice,
            timestamp: ticker.timestamp,
          },
        });
      } catch (error) {
        log.error(`[CryptoService] Failed to create ticker for ${ticker.symbol}:`, error);
      }
    }

  }

  async syncMarketsToDb(): Promise<void> {
    const markets = await this.getMarkets();
    
    for (const market of markets) {
      await prisma.cryptocurrency.upsert({
        where: { symbol: market.symbol },
        update: { name: market.name, nameKr: market.nameKr, isActive: true },
        create: {
          symbol: market.symbol,
          name: market.name,
          nameKr: market.nameKr,
          market: market.market,
          isActive: true,
        },
      });
    }
    
  }
}

export const upbitService = new UpbitService();
