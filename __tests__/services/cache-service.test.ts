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

// Redis instances created during tests (populated by the ioredis mock).
const mockRedisInstances: Array<{
  connect: jest.Mock;
  get: jest.Mock;
  setex: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  scan: jest.Mock;
  emit: (event: string, ...args: unknown[]) => void;
}> = [];

jest.mock('ioredis', () => {
  class MockRedis {
    listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    connect = jest.fn(async () => {
      this.emit('connect');
    });
    get = jest.fn();
    setex = jest.fn();
    set = jest.fn();
    del = jest.fn();
    scan = jest.fn();

    constructor(...args: unknown[]) {
      void args;
      mockRedisInstances.push(this as never);
    }

    on(event: string, cb: (...args: unknown[]) => void) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      (this.listeners[event] ?? []).forEach((cb) => cb(...args));
    }
  }
  return { __esModule: true, default: MockRedis };
});

// The CacheService class is instantiated as a singleton; access its
// constructor so we can create isolated instances per test group.
import {
  cacheService,
  CacheKeys,
  CacheTTL,
} from '@/lib/services/cache/cache-service';

const CacheServiceClass = cacheService.constructor as new () => {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
  has(key: string): Promise<boolean>;
  acquireLock(lockName: string, ttlSeconds?: number): Promise<boolean>;
  releaseLock(lockName: string): Promise<void>;
  stopCleanupInterval(): void;
};

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

  it('should generate correct cache keys for crypto candles plural', () => {
    expect(CacheKeys.cryptoCandles('BTC', 'minutes/5')).toBe('crypto:candles:BTC:minutes/5');
  });

  it('should generate sorted article list keys', () => {
    expect(CacheKeys.articles({ page: '2', category: 'tech', source: undefined })).toBe(
      'articles:list:category=tech&page=2'
    );
    expect(CacheKeys.articles({})).toBe('articles:list:');
  });

  it('should generate sorted AI/IT article list keys', () => {
    expect(CacheKeys.aiItArticles({ limit: '10', page: '1' })).toBe(
      'ai-it:articles:list:limit=10&page=1'
    );
    expect(CacheKeys.aiItArticles({})).toBe('ai-it:articles:list:');
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

describe('CacheService (in-memory mode)', () => {
  let cache: InstanceType<typeof CacheServiceClass>;

  beforeEach(() => {
    delete process.env.REDIS_URL;
    jest.clearAllMocks();
    cache = new CacheServiceClass();
  });

  afterEach(() => {
    cache.stopCleanupInterval();
    jest.useRealTimers();
  });

  it('should set and get a value', async () => {
    await cache.set('k1', { a: 1 });
    await expect(cache.get('k1')).resolves.toEqual({ a: 1 });
  });

  it('should return null for a missing key', async () => {
    await expect(cache.get('missing')).resolves.toBeNull();
  });

  it('should honor a custom TTL', async () => {
    jest.useFakeTimers();
    await cache.set('k2', 'v', { ttl: 60 });
    jest.advanceTimersByTime(61_000);
    await expect(cache.get('k2')).resolves.toBeNull();
  });

  it('should use the default TTL when none is given', async () => {
    jest.useFakeTimers();
    await cache.set('k3', 'v');
    jest.advanceTimersByTime(301_000);
    await expect(cache.get('k3')).resolves.toBeNull();
  });

  it('should report has() correctly', async () => {
    await expect(cache.has('k4')).resolves.toBe(false);
    await cache.set('k4', 'v');
    await expect(cache.has('k4')).resolves.toBe(true);
  });

  it('should delete a key', async () => {
    await cache.set('k5', 'v');
    await cache.delete('k5');
    await expect(cache.get('k5')).resolves.toBeNull();
  });

  it('should delete keys matching a pattern', async () => {
    await cache.set('stock:price:1', 'a');
    await cache.set('stock:price:2', 'b');
    await cache.set('other:key', 'c');

    await cache.deleteByPattern('stock:price:*');

    await expect(cache.get('stock:price:1')).resolves.toBeNull();
    await expect(cache.get('stock:price:2')).resolves.toBeNull();
    await expect(cache.get('other:key')).resolves.toBe('c');
  });

  it('should acquire a DB lock when Redis is unavailable', async () => {
    await expect(cache.acquireLock('my-lock', 60)).resolves.toBe(true);
  });

  it('should fail to acquire a held DB lock (P2002)', async () => {
    const { prisma } = jest.requireMock('@/lib/db');
    prisma.distributedLock.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(cache.acquireLock('held-lock')).resolves.toBe(false);
  });

  it('should clean expired locks before acquiring', async () => {
    const { prisma } = jest.requireMock('@/lib/db');
    await cache.acquireLock('cleanup-lock');
    expect(prisma.distributedLock.deleteMany).toHaveBeenCalledWith({
      where: { lockName: 'cleanup-lock', expiresAt: { lt: expect.any(Date) } },
    });
  });

  it('should release a DB lock', async () => {
    const { prisma } = jest.requireMock('@/lib/db');
    await cache.releaseLock('my-lock');
    expect(prisma.distributedLock.deleteMany).toHaveBeenCalledWith({
      where: { lockName: 'my-lock' },
    });
  });

  it('should not throw when releasing a missing lock', async () => {
    await expect(cache.releaseLock('ghost-lock')).resolves.toBeUndefined();
  });
});

describe('CacheService (Redis mode)', () => {
  let cache: InstanceType<typeof CacheServiceClass>;
  let redis: (typeof mockRedisInstances)[number];

  beforeEach(async () => {
    process.env.REDIS_URL = 'redis://test:6379';
    jest.clearAllMocks();
    cache = new CacheServiceClass();
    await new Promise((resolve) => setImmediate(resolve));
    redis = mockRedisInstances[mockRedisInstances.length - 1];
  });

  afterEach(() => {
    cache.stopCleanupInterval();
    delete process.env.REDIS_URL;
  });

  it('should store via SETEX', async () => {
    redis.setex.mockResolvedValue('OK');
    await cache.set('r1', { b: 2 }, { ttl: 120 });
    expect(redis.setex).toHaveBeenCalledWith(
      'economy-news:cache:r1',
      120,
      JSON.stringify({ b: 2 })
    );
  });

  it('should read from Redis and parse JSON', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ b: 2 }));
    await expect(cache.get('r1')).resolves.toEqual({ b: 2 });
    expect(redis.get).toHaveBeenCalledWith('economy-news:cache:r1');
  });

  it('should return null when Redis has no value', async () => {
    redis.get.mockResolvedValue(null);
    await expect(cache.get('r1')).resolves.toBeNull();
  });

  it('should fall back to memory when Redis fails', async () => {
    redis.setex.mockRejectedValueOnce(new Error('boom'));
    redis.get.mockRejectedValue(new Error('boom'));
    await cache.set('r2', 'v');
    await expect(cache.get('r2')).resolves.toBe('v');
  });

  it('should delete via Redis DEL', async () => {
    await cache.delete('r3');
    expect(redis.del).toHaveBeenCalledWith('economy-news:cache:r3');
  });

  it('should delete by pattern via SCAN', async () => {
    redis.scan.mockResolvedValueOnce(['0', ['economy-news:cache:stock:price:1']]);
    redis.del.mockResolvedValue(1);
    await cache.deleteByPattern('stock:price:*');
    expect(redis.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'economy-news:cache:stock:price:*',
      'COUNT',
      100
    );
    expect(redis.del).toHaveBeenCalledWith('economy-news:cache:stock:price:1');
  });

  it('should acquire a lock via Redis SET NX', async () => {
    redis.set.mockResolvedValue('OK');
    await expect(cache.acquireLock('lock-a')).resolves.toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'economy-news:lock:lock-a',
      expect.any(String),
      'EX',
      300,
      'NX'
    );
  });

  it('should fail to acquire a lock when Redis returns null', async () => {
    redis.set.mockResolvedValue(null);
    await expect(cache.acquireLock('lock-b')).resolves.toBe(false);
  });

  it('should release a lock via Redis DEL', async () => {
    await cache.releaseLock('lock-a');
    expect(redis.del).toHaveBeenCalledWith('economy-news:lock:lock-a');
  });
});
