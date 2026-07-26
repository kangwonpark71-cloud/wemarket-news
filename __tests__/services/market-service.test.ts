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
    globalIndex: (symbol: string) => `global:index:${symbol}`,
    globalIndices: () => 'global:indices:all',
    exchangeRate: (base: string, quote: string) => `forex:rate:${base}:${quote}`,
    forexDailyStat: (date: string) => `forex:daily:${date}`,
  },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    globalIndex: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({ id: 'idx-1', symbol: '^DJI' }),
    },
    globalIndexQuote: {
      create: jest.fn().mockResolvedValue({}),
    },
    exchangeRate: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { MarketService } from '@/lib/services/market/market-service';
import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MarketService', () => {
  let service: MarketService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketService();
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
    global.fetch = mockFetch;
  });

  describe('getAllExchangeRates', () => {
    it('should return cached rates if available', async () => {
      const cachedRates = [
        { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: 1350, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() },
      ];
      (cacheService.get as jest.Mock).mockResolvedValue(cachedRates);

      const result = await service.getAllExchangeRates();
      expect(result).toEqual(cachedRates);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch and parse exchange rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([
          { name: 'USDKRW=X', rate: 1350 },
          { name: 'JPYKRW=X', rate: 9.2 },
          { name: 'EURKRW=X', rate: 1450 },
        ])),
      });

      const result = await service.getAllExchangeRates();
      expect(result).toHaveLength(3);
      expect(result[0].baseCurrency).toBe('USD');
      expect(result[0].rate).toBe(1350);
      expect(result[1].baseCurrency).toBe('JPY');
      expect(result[2].baseCurrency).toBe('EUR');
      expect(cacheService.set).toHaveBeenCalledWith('forex:rates:all', result, { ttl: 300 });
    });

    it('should filter out KRW entries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([
          { name: 'KRW=X', rate: 1 },
          { name: 'USDKRW=X', rate: 1350 },
        ])),
      });

      const result = await service.getAllExchangeRates();
      expect(result).toHaveLength(1);
      expect(result[0].baseCurrency).toBe('USD');
    });

    it('should return empty array on fetch failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await service.getAllExchangeRates();
      expect(result).toEqual([]);
    });

    it('should return empty array on invalid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('invalid json'),
      });

      const result = await service.getAllExchangeRates();
      expect(result).toEqual([]);
    });

    it('should return empty array on empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
      });

      const result = await service.getAllExchangeRates();
      expect(result).toEqual([]);
    });

    it('should return empty array on non-array response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'not found' })),
      });

      const result = await service.getAllExchangeRates();
      expect(result).toEqual([]);
    });
  });

  describe('getExchangeRate', () => {
    it('should return cached rate if available', async () => {
      const cachedRate = { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: 1350, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedRate);

      const result = await service.getExchangeRate('USD');
      expect(result).toEqual(cachedRate);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch and return exchange rate', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([{ rate: 1350 }])),
      });

      const result = await service.getExchangeRate('USD');
      expect(result).not.toBeNull();
      expect(result?.baseCurrency).toBe('USD');
      expect(result?.rate).toBe(1350);
    });

    it('should return null on fetch failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await service.getExchangeRate('USD');
      expect(result).toBeNull();
    });

    it('should return null on empty array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify([])),
      });

      const result = await service.getExchangeRate('USD');
      expect(result).toBeNull();
    });
  });

  describe('saveExchangeRatesToDb', () => {
    it('should save rates to database', async () => {
      const rates = [
        { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: 1350, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() },
        { baseCurrency: 'JPY', quoteCurrency: 'KRW', rate: 9.2, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() },
      ];

      await service.saveExchangeRatesToDb(rates);
      expect(prisma.exchangeRate.create).toHaveBeenCalledTimes(2);
    });

    it('should continue on individual rate save failure', async () => {
      const rates = [
        { baseCurrency: 'USD', quoteCurrency: 'KRW', rate: 1350, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() },
        { baseCurrency: 'JPY', quoteCurrency: 'KRW', rate: 9.2, change: 0, changeRate: 0, source: 'Manana', timestamp: new Date() },
      ];

      (prisma.exchangeRate.create as jest.Mock)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({});

      await service.saveExchangeRatesToDb(rates);
      expect(prisma.exchangeRate.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getGlobalIndices', () => {
    it('should return cached indices if available', async () => {
      const cachedIndices = [
        { symbol: '^DJI', name: 'Dow Jones', price: 35000, change: 100, changeRate: 0.29, timestamp: new Date() },
      ];
      (cacheService.get as jest.Mock).mockResolvedValue(cachedIndices);

      const result = await service.getGlobalIndices();
      expect(result).toEqual(cachedIndices);
    });

    it('should fetch from Finnhub when FINNHUB_API_KEY is set', async () => {
      process.env.FINNHUB_API_KEY = 'test-key';

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          c: 35000,
          d: 100,
          dp: 0.29,
          o: 34900,
          h: 35100,
          l: 34800,
          pc: 34900,
          v: 1000000,
        }),
      });

      const result = await service.getGlobalIndices();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].symbol).toBe('^DJI');
      expect(result[0].price).toBe(35000);

      delete process.env.FINNHUB_API_KEY;
    });

    it('should fall back to DB when Finnhub fails', async () => {
      process.env.FINNHUB_API_KEY = 'test-key';
      mockFetch.mockRejectedValue(new Error('API error'));

      (prisma.globalIndex.findMany as jest.Mock).mockResolvedValue([
        {
          symbol: '^DJI',
          name: 'Dow Jones',
          nameKr: '다우존스',
          quotes: [{ price: 35000, change: 100, changeRate: 0.29, timestamp: new Date() }],
        },
      ]);

      const result = await service.getGlobalIndices();
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('^DJI');

      delete process.env.FINNHUB_API_KEY;
    });

    it('should return empty array when no FINNHUB_API_KEY and DB empty', async () => {
      delete process.env.FINNHUB_API_KEY;
      (prisma.globalIndex.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getGlobalIndices();
      expect(result).toEqual([]);
    });
  });

  describe('getForexDailyStat', () => {
    it('should return cached stat if available', async () => {
      const cachedStat = {
        date: '2024-01-15',
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
      (cacheService.get as jest.Mock).mockResolvedValue(cachedStat);

      const result = await service.getForexDailyStat('2024-01-15');
      expect(result).toEqual(cachedStat);
    });

    it('should return mock data structure when not cached', async () => {
      const result = await service.getForexDailyStat('2024-01-15');
      expect(result.date).toBe('2024-01-15');
      expect(result.usdRate).toBe(1350);
      expect(result.jpyRate).toBe(9.2);
      expect(result.eurRate).toBe(1450);
      expect(result.cnyRate).toBe(186);
      expect(cacheService.set).toHaveBeenCalledWith(
        'forex:daily:2024-01-15',
        result,
        { ttl: 86400 }
      );
    });
  });

  describe('getGlobalIndex', () => {
    it('should return cached index if available', async () => {
      const cachedIndex = { symbol: '^DJI', name: 'Dow Jones', price: 35000, change: 100, changeRate: 0.29, timestamp: new Date() };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedIndex);

      const result = await service.getGlobalIndex('^DJI');
      expect(result).toEqual(cachedIndex);
    });

    it('should return null when no API key', async () => {
      delete process.env.FINNHUB_API_KEY;
      const result = await service.getGlobalIndex('^DJI');
      expect(result).toBeNull();
    });

    it('should fetch from Finnhub when API key is set', async () => {
      process.env.FINNHUB_API_KEY = 'test-key';
      const serviceWithKey = new MarketService();

      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          c: 35000,
          d: 100,
          dp: 0.29,
          o: 34900,
          h: 35100,
          l: 34800,
          pc: 34900,
          v: 1000000,
        }),
      });

      const result = await serviceWithKey.getGlobalIndex('^DJI');
      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('^DJI');
      expect(result?.price).toBe(35000);
      expect(result?.nameKr).toBe('다우존스 산업평균');

      delete process.env.FINNHUB_API_KEY;
    });

    it('should return null on fetch error', async () => {
      process.env.FINNHUB_API_KEY = 'test-key';
      mockFetch.mockRejectedValue(new Error('API error'));

      const result = await service.getGlobalIndex('^DJI');
      expect(result).toBeNull();

      delete process.env.FINNHUB_API_KEY;
    });
  });
});
