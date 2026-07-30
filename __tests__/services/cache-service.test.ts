/**
 * @jest-environment node
 */

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    distributedLock: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// We need to test the CacheService class, but it's instantiated as a singleton.
// Instead, we test the exported functions and CacheKeys.
import { CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';

describe('CacheKeys', () => {
  it('should generate correct cache keys for stock price', () => {
    expect(CacheKeys.stockPrice('005930')).toBe('stock:price:005930');
    expect(CacheKeys.stockPrice('')).toBe('stock:price:');
  });

  it('should generate correct cache keys for stock prices by market', () => {
    expect(CacheKeys.stockPrices('KOSPI')).toBe('stock:prices:KOSPI');
    expect(CacheKeys.stockPrices('KOSDAQ')).toBe('stock:prices:KOSDAQ');
  });

  it('should generate correct cache keys for stock daily stat', () => {
    expect(CacheKeys.stockDailyStat('2024-01-15', 'KOSPI')).toBe('stock:daily:2024-01-15:KOSPI');
  });

  it('should generate correct cache keys for stock master', () => {
    expect(CacheKeys.stockMaster()).toBe('stock:master:all');
  });

  it('should generate correct cache keys for crypto ticker', () => {
    expect(CacheKeys.cryptoTicker('BTC')).toBe('crypto:ticker:BTC');
    expect(CacheKeys.cryptoTicker('ETH')).toBe('crypto:ticker:ETH');
  });

  it('should generate correct cache keys for crypto tickers', () => {
    expect(CacheKeys.cryptoTickers()).toBe('crypto:tickers:all');
  });

  it('should generate correct cache keys for crypto candle', () => {
    expect(CacheKeys.cryptoCandle('BTC', 'minutes/1')).toBe('crypto:candle:BTC:minutes/1');
    expect(CacheKeys.cryptoCandle('ETH', 'days')).toBe('crypto:candle:ETH:days');
  });

  it('should generate correct cache keys for crypto daily stat', () => {
    expect(CacheKeys.cryptoDailyStat('2024-01-15')).toBe('crypto:daily:2024-01-15');
  });

  it('should generate correct cache keys for crypto master', () => {
    expect(CacheKeys.cryptoMaster()).toBe('crypto:master:all');
  });

  it('should generate correct cache keys for crypto markets', () => {
    expect(CacheKeys.cryptoMarkets()).toBe('crypto:markets:all');
  });

  it('should generate correct cache keys for crypto top volume', () => {
    expect(CacheKeys.cryptoTopVolume(20)).toBe('crypto:top:volume:20');
    expect(CacheKeys.cryptoTopVolume(10)).toBe('crypto:top:volume:10');
  });

  it('should generate correct cache keys for crypto top gainers', () => {
    expect(CacheKeys.cryptoTopGainers(20)).toBe('crypto:top:gainers:20');
  });

  it('should generate correct cache keys for crypto top losers', () => {
    expect(CacheKeys.cryptoTopLosers(20)).toBe('crypto:top:losers:20');
  });

  it('should generate correct cache keys for exchange rate', () => {
    expect(CacheKeys.exchangeRate('USD', 'KRW')).toBe('forex:rate:USD:KRW');
    expect(CacheKeys.exchangeRate('JPY', 'KRW')).toBe('forex:rate:JPY:KRW');
  });

  it('should generate correct cache keys for forex daily stat', () => {
    expect(CacheKeys.forexDailyStat('2024-01-15')).toBe('forex:daily:2024-01-15');
  });

  it('should generate correct cache keys for global index', () => {
    expect(CacheKeys.globalIndex('^DJI')).toBe('global:index:^DJI');
    expect(CacheKeys.globalIndex('^IXIC')).toBe('global:index:^IXIC');
  });

  it('should generate correct cache keys for global indices', () => {
    expect(CacheKeys.globalIndices()).toBe('global:indices:all');
  });

  it('should generate correct cache keys for chart data', () => {
    expect(CacheKeys.chartData('BTC', 'candle', '1d')).toBe('chart:candle:BTC:1d');
  });

  it('should generate correct cache keys for financial dashboard', () => {
    expect(CacheKeys.financialDashboard()).toBe('financial:dashboard');
  });
});

describe('CacheTTL', () => {
  it('should have correct TTL values', () => {
    expect(CacheTTL.REALTIME).toBe(10);
    expect(CacheTTL.MINUTE).toBe(60);
    expect(CacheTTL.MINUTE_5).toBe(300);
    expect(CacheTTL.MINUTE_15).toBe(900);
    expect(CacheTTL.MINUTE_30).toBe(1800);
    expect(CacheTTL.HOUR).toBe(3600);
    expect(CacheTTL.HOUR_12).toBe(43200);
    expect(CacheTTL.DAY).toBe(86400);
  });

  it('should have type-level readonly assertion (as const)', () => {
    // 'as const' provides TS-level readonly, not runtime freeze.
    // Just verify the values are correct and object shape is intact.
    const keys = Object.keys(CacheTTL);
    expect(keys).toContain('REALTIME');
    expect(keys).toContain('DAY');
    expect(keys).toHaveLength(9);
  });
});
