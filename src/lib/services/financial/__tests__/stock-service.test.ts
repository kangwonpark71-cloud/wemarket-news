/**
 * stock-service.test.ts
 * Tests for KoreaInvestmentClient, YahooFinanceClient, StockService.
 */
import {
  KoreaInvestmentClient,
  YahooFinanceClient,
  StockService,
} from '@/lib/services/financial/stock-service';
import { cacheService } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    stock: { upsert: jest.fn(), create: jest.fn() },
    stockPrice: { create: jest.fn() },
  },
}));

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function mockKisFetch(dataResponse: unknown): jest.Mock {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('/oauth2/tokenP')) {
      return Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'test-token', expires_in: 86400 }),
      });
    }
    return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue(dataResponse) });
  });
}

beforeEach(() => {
  global.fetch = jest.fn();
  // Default cache miss
  jest.spyOn(cacheService, 'get').mockResolvedValue(null);
  jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);
  jest.spyOn(cacheService, 'delete').mockResolvedValue(undefined);
  jest.spyOn(cacheService, 'deleteByPattern').mockResolvedValue(undefined);
  // jest.mock factory fns are NOT cleared by restoreAllMocks — clear manually
  (prisma.stock.upsert as jest.Mock).mockClear();
  (prisma.stock.create as jest.Mock).mockClear();
  (prisma.stockPrice.create as jest.Mock).mockClear();
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

// ============================================================================
// KoreaInvestmentClient
// ============================================================================

describe('KoreaInvestmentClient', () => {
  describe('isConfigured', () => {
    it('returns false when no keys are set', () => {
      delete process.env.KOREA_INVEST_APP_KEY;
      delete process.env.KOREA_INVEST_APP_SECRET;
      const client = new KoreaInvestmentClient();
      expect(client.isConfigured()).toBe(false);
    });

    it('returns false when appKey is placeholder', () => {
      process.env.KOREA_INVEST_APP_KEY = 'placeholder';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();
      expect(client.isConfigured()).toBe(false);
    });

    it('returns true when real keys are set', () => {
      process.env.KOREA_INVEST_APP_KEY = 'real-key';
      process.env.KOREA_INVEST_APP_SECRET = 'real-secret';
      const client = new KoreaInvestmentClient();
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('mock data', () => {
    it('getMockOverview returns kospi/kosdaq values', () => {
      const client = new KoreaInvestmentClient();
      const overview = client.getMockOverview();
      expect(overview.kospi).toBeDefined();
      expect(overview.kosdaq).toBeDefined();
      expect(overview.kospi.value).toBeGreaterThan(0);
      expect(overview.kosdaq.value).toBeGreaterThan(0);
    });

    it('getMockStockMaster returns 8 stocks with market field', () => {
      const client = new KoreaInvestmentClient();
      const stocks = client.getMockStockMaster();
      expect(stocks).toHaveLength(8);
      expect(stocks[0]).toMatchObject({ code: '005930', name: '삼성전자', market: 'KOSPI' });
      expect(stocks[7]).toMatchObject({ code: '247540', market: 'KOSDAQ' });
    });

    it('getMockStockPrice returns valid price data for known code', () => {
      const client = new KoreaInvestmentClient();
      const price = client.getMockStockPrice('005930');
      expect(price.code).toBe('005930');
      expect(price.name).toBe('삼성전자');
      expect(price.price).toBeGreaterThan(0);
      expect(price.changeRate).toBeCloseTo(((price.price - 78500) / 78500) * 100, 5);
    });

    it('getMockStockPrice falls back to 가상종목 for unknown code', () => {
      const client = new KoreaInvestmentClient();
      const price = client.getMockStockPrice('999999');
      expect(price.name).toBe('가상종목');
      expect(price.price).toBeGreaterThan(0);
    });
  });

  describe('getStockPrice', () => {
    it('returns cached data without fetching', async () => {
      const cached = { code: '005930', name: '삼성전자', price: 78500 } as never;
      jest.spyOn(cacheService, 'get').mockResolvedValue(cached);

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();

      const result = await client.getStockPrice('005930');
      expect(result).toBe(cached);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches and parses KIS response, then caches', async () => {
      global.fetch = mockKisFetch({
        rt_cd: '0',
        output: {
          hts_kor_isnm: '삼성전자',
          stck_prpr: '78500',
          prdy_vrss: '500',
          prdy_ctrt: '0.64',
          stck_oprc: '78000',
          stck_hgpr: '79000',
          stck_lwpr: '77500',
          acml_vol: '1000000',
          acml_tr_pbmn: '78000000000',
          hts_avls: '47000000000000',
        },
      });

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();

      const result = await client.getStockPrice('005930');
      expect(result).toMatchObject({
        code: '005930',
        name: '삼성전자',
        price: 78500,
        change: 500,
        changeRate: 0.64,
        openPrice: 78000,
        highPrice: 79000,
        lowPrice: 77500,
        volume: 1000000,
        tradingValue: 78000000000,
        marketCap: 47000000000000,
      });
      // token endpoint + price endpoint
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledWith(
        'stock:price:005930',
        expect.anything(),
        expect.anything(),
      );
    });

    it('returns null when rt_cd is not 0', async () => {
      global.fetch = mockKisFetch({ rt_cd: '1', msg1: 'invalid code' });

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();

      const result = await client.getStockPrice('XXXXX');
      expect(result).toBeNull();
    });
  });

  describe('getStockMaster', () => {
    it('maps K market to KOSPI and other to KOSDAQ', async () => {
      global.fetch = mockKisFetch({
        rt_cd: '0',
        output: [
          {
            mksc_shrn_iscd: '005930',
            hts_kor_isnm: '삼성전자',
            mrkt_cls_cd: 'K',
            secs_cls_cd: '전기전자',
            induty_cls_cd: '반도체',
            lstn_dt: '19750129',
          },
          {
            mksc_shrn_iscd: '247540',
            hts_kor_isnm: '에코프로비엠',
            mrkt_cls_cd: 'Q',
          },
        ],
      });

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();

      const stocks = await client.getStockMaster();
      expect(stocks).toHaveLength(2);
      expect(stocks[0]).toMatchObject({
        code: '005930',
        name: '삼성전자',
        market: 'KOSPI',
        sector: '전기전자',
        industry: '반도체',
      });
      expect(stocks[0].listingDate).toBeInstanceOf(Date);
      expect(stocks[1].market).toBe('KOSDAQ');
    });

    it('returns [] when API fails', async () => {
      global.fetch = mockKisFetch({ rt_cd: '1', msg1: 'fail' });

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();

      expect(await client.getStockMaster()).toEqual([]);
    });
  });

  describe('getMarketOverview', () => {
    it('builds overview from index prices', async () => {
      const priceMap = new Map<string, never>([
        ['001', { price: 2620.5, change: 12.45, changeRate: 0.48 } as never],
        ['101', { price: 845.2, change: -2.15, changeRate: -0.25 } as never],
      ]);
      jest.spyOn(cacheService, 'get').mockImplementation(async (key: string) => {
        if (key === 'market:overview') return null;
        return priceMap.get(key) ?? null;
      });

      process.env.KOREA_INVEST_APP_KEY = 'key';
      process.env.KOREA_INVEST_APP_SECRET = 'secret';
      const client = new KoreaInvestmentClient();
      jest.spyOn(client, 'getStockPrices').mockResolvedValue(priceMap);

      const overview = await client.getMarketOverview();
      expect(overview.kospi).toEqual({ value: 2620.5, change: 12.45, changeRate: 0.48 });
      expect(overview.kosdaq).toEqual({ value: 845.2, change: -2.15, changeRate: -0.25 });
    });
  });
});

// ============================================================================
// YahooFinanceClient
// ============================================================================

describe('YahooFinanceClient', () => {
  it('getStockPrice parses yahoo chart meta', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: 78500,
                chartPreviousClose: 78000,
                shortName: 'Samsung Electronics',
                regularMarketOpen: 78000,
                regularMarketDayHigh: 79000,
                regularMarketDayLow: 77500,
                regularMarketVolume: 1000000,
              },
            },
          ],
        },
      }),
    });

    const client = new YahooFinanceClient();
    const result = await client.getStockPrice('005930');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('005930');
    expect(result!.name).toBe('삼성전자');
    expect(result!.price).toBe(78500);
    expect(result!.change).toBeCloseTo(500, 5);
    expect(result!.changeRate).toBeCloseTo(0.64, 5);
    expect(cacheService.set).toHaveBeenCalledWith('yahoo:price:005930', expect.anything(), { ttl: 60 });
  });

  it('getStockPrice returns null on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 429 });
    const client = new YahooFinanceClient();
    expect(await client.getStockPrice('005930')).toBeNull();
  });

  it('getStockPrice returns null on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    const client = new YahooFinanceClient();
    expect(await client.getStockPrice('005930')).toBeNull();
  });

  it('getStockPrice uses cached value', async () => {
    const cached = { code: '005930', price: 100 } as never;
    jest.spyOn(cacheService, 'get').mockResolvedValue(cached);
    const client = new YahooFinanceClient();
    expect(await client.getStockPrice('005930')).toBe(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('getStockMaster returns entries from STOCK_NAMES', async () => {
    const client = new YahooFinanceClient();
    const master = await client.getStockMaster();
    expect(master.length).toBeGreaterThan(20);
    const samsung = master.find((s) => s.code === '005930');
    expect(samsung).toMatchObject({ name: '삼성전자', market: 'KOSPI' });
    const ecoPro = master.find((s) => s.code === '247540');
    expect(ecoPro?.market).toBe('KOSDAQ');
  });

  it('getStockPrices fetches uncached codes in parallel', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: jest.fn().mockResolvedValue({
          chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 90, regularMarketVolume: 10 } }] },
        }),
      }),
    );

    const client = new YahooFinanceClient();
    const map = await client.getStockPrices(['005930', '000660']);
    expect(map.size).toBe(2);
    expect(map.get('005930')?.code).toBe('005930');
    expect(map.get('000660')?.code).toBe('000660');
  });
});

// ============================================================================
// StockService (strategy: KIS → Yahoo → Mock)
// ============================================================================

describe('StockService', () => {
  function createFallbackService(): StockService {
    delete process.env.KOREA_INVEST_APP_KEY;
    delete process.env.KOREA_INVEST_APP_SECRET;
    return new StockService();
  }

  function createLiveService(): StockService {
    process.env.KOREA_INVEST_APP_KEY = 'key';
    process.env.KOREA_INVEST_APP_SECRET = 'secret';
    return new StockService();
  }

  describe('provider selection', () => {
    it('uses yahoo fallback when KIS not configured', () => {
      const svc = createFallbackService();
      expect(svc.getProviderInfo()).toEqual({
        name: 'Yahoo Finance (Fallback)',
        status: 'yahoo_fallback',
        isSimulated: true,
      });
      expect(svc.isSimulated).toBe(true);
    });

    it('uses live KIS when configured', () => {
      const svc = createLiveService();
      expect(svc.getProviderInfo()).toMatchObject({ status: 'live', isSimulated: false });
    });
  });

  describe('getStockPrice fallback chain', () => {
    it('returns yahoo result and marks live when yahoo succeeds', async () => {
      const svc = createFallbackService();
      const yahooQuote = { code: '005930', price: 78500, name: '삼성전자' } as never;
      jest.spyOn(cacheService, 'get').mockImplementation(async (key: string) =>
        key.startsWith('yahoo') ? yahooQuote : null,
      );

      const result = await svc.getStockPrice('005930');
      expect(result).toBe(yahooQuote);
      expect(svc.isSimulated).toBe(false);
    });

    it('falls back to mock when yahoo fails', async () => {
      const svc = createFallbackService();
      // cache miss + fetch fail → yahoo returns null
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const result = await svc.getStockPrice('005930');
      expect(result?.code).toBe('005930');
      expect(result?.name).toBe('삼성전자');
      expect(svc.isSimulated).toBe(true);
    });
  });

  describe('getStockPrices', () => {
    it('uses mock map when yahoo returns nothing', async () => {
      const svc = createFallbackService();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const map = await svc.getStockPrices(['005930', '000660']);
      expect(map.size).toBe(2);
      expect(map.get('005930')?.name).toBe('삼성전자');
      expect(svc.isSimulated).toBe(true);
    });
  });

  describe('getMarketOverview', () => {
    it('returns simulated overview when in mock mode', async () => {
      const svc = createFallbackService();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const overview = await svc.getMarketOverview();
      expect(overview).toHaveProperty('simulated', true);
      expect(overview.kospi.value).toBeGreaterThan(0);
    });
  });

  describe('getTopGainers / getTopLosers / getTopVolume', () => {
    function makeServiceWithPrices(): StockService {
      const svc = createFallbackService();
      const master = [
        { code: 'A', name: 'A', market: 'KOSPI' },
        { code: 'B', name: 'B', market: 'KOSPI' },
        { code: 'C', name: 'C', market: 'KOSDAQ' },
      ];
      const prices = new Map<string, never>([
        ['A', { code: 'A', changeRate: 2.5, volume: 100 } as never],
        ['B', { code: 'B', changeRate: -1.5, volume: 500 } as never],
        ['C', { code: 'C', changeRate: 0.8, volume: 300 } as never],
      ]);
      jest.spyOn(svc, 'getStockMaster').mockResolvedValue(master as never);
      jest.spyOn(svc, 'getStockPrices').mockImplementation(async (codes: string[]) => {
        const filtered = new Map<string, never>();
        for (const c of codes) {
          const p = prices.get(c);
          if (p) filtered.set(c, p);
        }
        return filtered;
      });
      return svc;
    }

    it('getTopGainers returns sorted positive changeRate', async () => {
      const svc = makeServiceWithPrices();
      const gainers = await svc.getTopGainers('ALL', 10);
      expect(gainers.map((g) => g.code)).toEqual(['A', 'C']);
    });

    it('getTopLosers returns sorted negative changeRate', async () => {
      const svc = makeServiceWithPrices();
      const losers = await svc.getTopLosers('ALL', 10);
      expect(losers.map((l) => l.code)).toEqual(['B']);
    });

    it('getTopVolume sorts by volume desc', async () => {
      const svc = makeServiceWithPrices();
      const vol = await svc.getTopVolume('ALL', 10);
      expect(vol.map((v) => v.code)).toEqual(['B', 'C', 'A']);
    });

    it('getTopGainers filters by market', async () => {
      const svc = makeServiceWithPrices();
      const gainers = await svc.getTopGainers('KOSPI', 10);
      expect(gainers.map((g) => g.code)).toEqual(['A']);
    });
  });

  describe('DB persistence', () => {
    it('saveStockPricesToDb upserts stock + creates price', async () => {
      const svc = createFallbackService();
      (prisma.stock.upsert as jest.Mock).mockResolvedValue({ id: 'stock-1' });
      (prisma.stockPrice.create as jest.Mock).mockResolvedValue({ id: 'price-1' });

      await svc.saveStockPricesToDb([
        {
          code: '005930',
          name: '삼성전자',
          price: 78500,
          change: 500,
          changeRate: 0.64,
          openPrice: 78000,
          highPrice: 79000,
          lowPrice: 77500,
          volume: 1000000,
          tradingValue: 78000000000,
          timestamp: new Date(),
        },
      ]);

      expect(prisma.stock.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.stockPrice.create).toHaveBeenCalledTimes(1);
    });

    it('skips prices with missing required fields', async () => {
      const svc = createFallbackService();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await svc.saveStockPricesToDb([
        { code: '005930', name: '삼성전자', price: null } as never,
      ]);

      expect(prisma.stock.upsert).not.toHaveBeenCalled();
      expect(prisma.stockPrice.create).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('syncStockMasterToDb upserts each stock', async () => {
      const svc = createFallbackService();
      jest.spyOn(svc, 'getStockMaster').mockResolvedValue([
        { code: '005930', name: '삼성전자', market: 'KOSPI' },
        { code: '000660', name: 'SK하이닉스', market: 'KOSPI' },
      ]);
      (prisma.stock.upsert as jest.Mock).mockResolvedValue({ id: 's' });

      await svc.syncStockMasterToDb();
      expect(prisma.stock.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.stock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: '005930' } }),
      );
    });
  });

  describe('clearCache', () => {
    it('clears all stock cache patterns', async () => {
      const svc = createFallbackService();
      await svc.clearCache();
      expect(cacheService.deleteByPattern).toHaveBeenCalledWith('stock:price:*');
      expect(cacheService.deleteByPattern).toHaveBeenCalledWith('stock:master:*');
      expect(cacheService.deleteByPattern).toHaveBeenCalledWith('yahoo:price:*');
      expect(cacheService.delete).toHaveBeenCalledWith('market:overview');
      expect(cacheService.delete).toHaveBeenCalledWith('korea_investment:access_token');
    });
  });
});
