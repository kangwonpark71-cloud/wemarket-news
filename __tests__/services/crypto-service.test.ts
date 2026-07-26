/**
 * @jest-environment node
 */

// Mock dependencies
jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CacheKeys: {
    cryptoTicker: (symbol: string) => `crypto:ticker:${symbol}`,
    cryptoTickers: () => 'crypto:tickers:all',
    cryptoCandle: (symbol: string, unit: string) => `crypto:candle:${symbol}:${unit}`,
    cryptoTopVolume: (limit: number) => `crypto:top:volume:${limit}`,
    cryptoTopGainers: (limit: number) => `crypto:top:gainers:${limit}`,
    cryptoTopLosers: (limit: number) => `crypto:top:losers:${limit}`,
    cryptoMarkets: () => 'crypto:markets:all',
  },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    cryptocurrency: {
      upsert: jest.fn().mockResolvedValue({ id: 'crypto-1', symbol: 'BTC' }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'crypto-1', symbol: 'BTC' },
        { id: 'crypto-2', symbol: 'ETH' },
      ]),
    },
    cryptoTicker: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { UpbitService } from '@/lib/services/crypto/crypto-service';
import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UpbitService', () => {
  let service: UpbitService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UpbitService();
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
    // Ensure mockFetch is the global fetch
    global.fetch = mockFetch;
  });

  describe('getMarkets', () => {
    it('should return cached markets if available', async () => {
      const cachedMarkets = [
        { symbol: 'BTC', name: 'Bitcoin', nameKr: '비트코인', market: 'KRW-BTC', isActive: true },
      ];
      (cacheService.get as jest.Mock).mockResolvedValue(cachedMarkets);

      const result = await service.getMarkets();
      expect(result).toEqual(cachedMarkets);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch and parse markets from Upbit', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
          { market: 'USDT-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
        ]),
      });

      const result = await service.getMarkets();
      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].market).toBe('KRW-BTC');
      expect(result[1].symbol).toBe('ETH');
    });

    it('should filter out non-KRW markets', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'USDT-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
        ]),
      });

      const result = await service.getMarkets();
      expect(result).toHaveLength(1);
      expect(result[0].market).toBe('KRW-BTC');
    });
  });

  describe('getAllTickers', () => {
    it('should return cached tickers if available', async () => {
      const cachedTickers = [
        { symbol: 'BTC', tradePrice: 50000000, signedChangeRate: 2.5 },
      ];
      (cacheService.get as jest.Mock).mockResolvedValue(cachedTickers);

      const result = await service.getAllTickers();
      expect(result).toEqual(cachedTickers);
    });

    it('should fetch and parse tickers from Upbit', async () => {
      // Mock getMarkets
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
        ]),
      });

      // Mock tickers
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          {
            market: 'KRW-BTC',
            trade_price: 50000000,
            signed_change_price: 1000000,
            signed_change_rate: 0.02,
            ask_price: 50000000,
            bid_price: 50000000,
            acc_trade_price_24h: 1000000000000,
            acc_trade_volume_24h: 20000,
            high_price: 51000000,
            low_price: 49000000,
            prev_closing_price: 49000000,
            timestamp: Date.now(),
          },
        ]),
      });

      const result = await service.getAllTickers();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].tradePrice).toBe(50000000);
      expect(result[0].signedChangeRate).toBe(2); // 0.02 * 100
    });

    it('should sort tickers by trade price descending', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
        ]),
      });

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-ETH', trade_price: 3000000, signed_change_price: 0, signed_change_rate: 0, ask_price: 3000000, bid_price: 3000000, acc_trade_price_24h: 100000000000, acc_trade_volume_24h: 30000, high_price: 3100000, low_price: 2900000, prev_closing_price: 3000000, timestamp: Date.now() },
          { market: 'KRW-BTC', trade_price: 50000000, signed_change_price: 0, signed_change_rate: 0, ask_price: 50000000, bid_price: 50000000, acc_trade_price_24h: 1000000000000, acc_trade_volume_24h: 20000, high_price: 51000000, low_price: 49000000, prev_closing_price: 50000000, timestamp: Date.now() },
        ]),
      });

      const result = await service.getAllTickers();
      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });
  });

  describe('getTicker', () => {
    it('should return cached ticker if available', async () => {
      const cachedTicker = { symbol: 'BTC', tradePrice: 50000000 };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedTicker);

      const result = await service.getTicker('BTC');
      expect(result).toEqual(cachedTicker);
    });

    it('should fetch single ticker from Upbit', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          {
            market: 'KRW-BTC',
            trade_price: 50000000,
            signed_change_price: 1000000,
            signed_change_rate: 0.02,
            ask_price: 50000000,
            bid_price: 50000000,
            acc_trade_price_24h: 1000000000000,
            acc_trade_volume_24h: 20000,
            high_price: 51000000,
            low_price: 49000000,
            prev_closing_price: 49000000,
            timestamp: Date.now(),
          },
        ]),
      });

      const result = await service.getTicker('BTC');
      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('BTC');
      expect(result?.tradePrice).toBe(50000000);
    });

    it('should return null for empty response', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getTicker('INVALID');
      expect(result).toBeNull();
    });
  });

  describe('getCandles', () => {
    it('should return cached candles if available', async () => {
      const cachedCandles = [
        { symbol: 'BTC', unit: 'minutes/1', openPrice: 50000000, highPrice: 50100000, lowPrice: 49900000, tradePrice: 50050000 },
      ];
      (cacheService.get as jest.Mock).mockResolvedValue(cachedCandles);

      const result = await service.getCandles('BTC');
      expect(result).toEqual(cachedCandles);
    });

    it('should fetch candles from Upbit', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          {
            opening_price: 50000000,
            high_price: 50100000,
            low_price: 49900000,
            trade_price: 50050000,
            candle_acc_trade_volume: 100,
            candle_acc_trade_price: 5000000000,
            candle_date_time_kst: '2024-01-15T10:00:00',
          },
        ]),
      });

      const result = await service.getCandles('BTC', 'minutes/1', 1);
      expect(result).toHaveLength(1);
      expect(result[0].openPrice).toBe(50000000);
    });

    it('should reverse candles to chronological order', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          { opening_price: 50100000, high_price: 50100000, low_price: 50100000, trade_price: 50100000, candle_acc_trade_volume: 100, candle_acc_trade_price: 5010000000, candle_date_time_kst: '2024-01-15T10:01:00' },
          { opening_price: 50000000, high_price: 50000000, low_price: 50000000, trade_price: 50000000, candle_acc_trade_volume: 100, candle_acc_trade_price: 5000000000, candle_date_time_kst: '2024-01-15T10:00:00' },
        ]),
      });

      const result = await service.getCandles('BTC', 'minutes/1', 2);
      expect(result[0].openPrice).toBe(50000000); // Earlier first
      expect(result[1].openPrice).toBe(50100000); // Later second
    });
  });

  describe('getTopVolume', () => {
    it('should return cached top volume if available', async () => {
      const cached = [{ symbol: 'BTC', accTradePrice24h: 1000000000000 }];
      (cacheService.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.getTopVolume();
      expect(result).toEqual(cached);
    });

    it('should sort by 24h trade price and limit', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
        ]),
      });

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-ETH', trade_price: 3000000, signed_change_price: 0, signed_change_rate: 0, ask_price: 3000000, bid_price: 3000000, acc_trade_price_24h: 500000000000, acc_trade_volume_24h: 150000, high_price: 3100000, low_price: 2900000, prev_closing_price: 3000000, timestamp: Date.now() },
          { market: 'KRW-BTC', trade_price: 50000000, signed_change_price: 0, signed_change_rate: 0, ask_price: 50000000, bid_price: 50000000, acc_trade_price_24h: 1000000000000, acc_trade_volume_24h: 20000, high_price: 51000000, low_price: 49000000, prev_closing_price: 50000000, timestamp: Date.now() },
        ]),
      });

      const result = await service.getTopVolume(1);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
    });
  });

  describe('getTopGainers', () => {
    it('should return only positive change rate tickers', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
        ]),
      });

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-ETH', trade_price: 3000000, signed_change_price: 100000, signed_change_rate: 0.035, ask_price: 3000000, bid_price: 3000000, acc_trade_price_24h: 500000000000, acc_trade_volume_24h: 150000, high_price: 3100000, low_price: 2900000, prev_closing_price: 2900000, timestamp: Date.now() },
          { market: 'KRW-BTC', trade_price: 50000000, signed_change_price: -1000000, signed_change_rate: -0.02, ask_price: 50000000, bid_price: 50000000, acc_trade_price_24h: 1000000000000, acc_trade_volume_24h: 20000, high_price: 51000000, low_price: 49000000, prev_closing_price: 51000000, timestamp: Date.now() },
        ]),
      });

      const result = await service.getTopGainers();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('ETH');
      expect(result[0].signedChangeRate).toBeGreaterThan(0);
    });
  });

  describe('getTopLosers', () => {
    it('should return only negative change rate tickers', async () => {
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
        ]),
      });

      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-ETH', trade_price: 3000000, signed_change_price: 100000, signed_change_rate: 0.035, ask_price: 3000000, bid_price: 3000000, acc_trade_price_24h: 500000000000, acc_trade_volume_24h: 150000, high_price: 3100000, low_price: 2900000, prev_closing_price: 2900000, timestamp: Date.now() },
          { market: 'KRW-BTC', trade_price: 50000000, signed_change_price: -1000000, signed_change_rate: -0.02, ask_price: 50000000, bid_price: 50000000, acc_trade_price_24h: 1000000000000, acc_trade_volume_24h: 20000, high_price: 51000000, low_price: 49000000, prev_closing_price: 51000000, timestamp: Date.now() },
        ]),
      });

      const result = await service.getTopLosers();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].signedChangeRate).toBeLessThan(0);
    });
  });

  describe('saveTickersToDb', () => {
    it('should upsert cryptocurrency and create ticker', async () => {
      const tickers = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          tradePrice: 50000000,
          signedChangePrice: 1000000,
          signedChangeRate: 2,
          askPrice: 50000000,
          bidPrice: 50000000,
          accTradePrice24h: 1000000000000,
          accTradeVolume24h: 20000,
          highPrice24h: 51000000,
          lowPrice24h: 49000000,
          prevClosingPrice: 49000000,
          timestamp: new Date(),
        },
      ];

      await service.saveTickersToDb(tickers);
      expect(prisma.cryptocurrency.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { symbol: 'BTC' },
          create: expect.objectContaining({ symbol: 'BTC' }),
        })
      );
      expect(prisma.cryptoTicker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cryptoId: 'crypto-1' }),
        })
      );
    });

    it('should use tradePrice as fallback for undefined askPrice', async () => {
      const tickers = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          tradePrice: 50000000,
          signedChangePrice: 1000000,
          signedChangeRate: 2,
          askPrice: undefined as unknown as number,
          bidPrice: undefined as unknown as number,
          accTradePrice24h: 1000000000000,
          accTradeVolume24h: 20000,
          highPrice24h: 51000000,
          lowPrice24h: 49000000,
          prevClosingPrice: 49000000,
          timestamp: new Date(),
        },
      ];

      await service.saveTickersToDb(tickers);
      expect(prisma.cryptoTicker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            askPrice: 50000000, // fallback to tradePrice
            bidPrice: 50000000, // fallback to tradePrice
          }),
        })
      );
    });

    it('should continue on individual ticker save failure', async () => {
      const tickers = [
        { symbol: 'BTC', name: 'Bitcoin', tradePrice: 50000000, signedChangePrice: 0, signedChangeRate: 0, askPrice: 50000000, bidPrice: 50000000, accTradePrice24h: 0, accTradeVolume24h: 0, highPrice24h: 0, lowPrice24h: 0, prevClosingPrice: 0, timestamp: new Date() },
        { symbol: 'ETH', name: 'Ethereum', tradePrice: 3000000, signedChangePrice: 0, signedChangeRate: 0, askPrice: 3000000, bidPrice: 3000000, accTradePrice24h: 0, accTradeVolume24h: 0, highPrice24h: 0, lowPrice24h: 0, prevClosingPrice: 0, timestamp: new Date() },
      ];

      (prisma.cryptocurrency.upsert as jest.Mock)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'crypto-2', symbol: 'ETH' });

      (prisma.cryptocurrency.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'crypto-2', symbol: 'ETH' },
        ]);

      (prisma.cryptoTicker.create as jest.Mock)
        .mockResolvedValueOnce({});

      await service.saveTickersToDb(tickers);
      expect(prisma.cryptocurrency.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.cryptoTicker.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncMarketsToDb', () => {
    it('should upsert all markets to database', async () => {
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue([
          { market: 'KRW-BTC', english_name: 'Bitcoin', korean_name: '비트코인' },
          { market: 'KRW-ETH', english_name: 'Ethereum', korean_name: '이더리움' },
        ]),
      });

      await service.syncMarketsToDb();
      expect(prisma.cryptocurrency.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
