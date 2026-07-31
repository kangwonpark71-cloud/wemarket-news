/**
 * cache-service.test.ts
 * Tests for in-memory cache fallback, CacheKeys, CacheTTL, distributed locks.
 */
import { cacheService, CacheKeys, CacheTTL } from '@/lib/services/cache/cache-service';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    distributedLock: { deleteMany: jest.fn(), create: jest.fn() },
  },
}));

beforeEach(() => {
  (prisma.distributedLock.deleteMany as jest.Mock).mockClear();
  (prisma.distributedLock.create as jest.Mock).mockClear();
  (prisma.distributedLock.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  (prisma.distributedLock.create as jest.Mock).mockResolvedValue({ id: 'lock-1' });
});

describe('cacheService (in-memory fallback)', () => {
  it('set + get roundtrip', async () => {
    await cacheService.set('test:key', { hello: 'world' });
    const value = await cacheService.get<{ hello: string }>('test:key');
    expect(value).toEqual({ hello: 'world' });
  });

  it('get returns null for missing key', async () => {
    expect(await cacheService.get('missing:key')).toBeNull();
  });

  it('get returns null for expired entry with ttl 0', async () => {
    await cacheService.set('test:expired', 'value', { ttl: 0 });
    expect(await cacheService.get('test:expired')).toBeNull();
  });

  it('set respects custom ttl', async () => {
    await cacheService.set('test:ttl', 'v', { ttl: 60 });
    expect(await cacheService.get('test:ttl')).toBe('v');
  });

  it('set stores arbitrary types (objects, arrays, numbers)', async () => {
    await cacheService.set('test:types', { a: [1, 2, 3], n: 42 });
    const value = await cacheService.get<{ a: number[]; n: number }>('test:types');
    expect(value).toEqual({ a: [1, 2, 3], n: 42 });
  });

  it('has returns true/false', async () => {
    expect(await cacheService.has('test:has')).toBe(false);
    await cacheService.set('test:has', 'x');
    expect(await cacheService.has('test:has')).toBe(true);
  });

  it('delete removes the key', async () => {
    await cacheService.set('test:del', 'x');
    await cacheService.delete('test:del');
    expect(await cacheService.get('test:del')).toBeNull();
  });

  it('delete on missing key does not throw', async () => {
    await expect(cacheService.delete('test:none')).resolves.toBeUndefined();
  });

  it('deleteByPattern removes only matching keys', async () => {
    await cacheService.set('stock:price:005930', 1);
    await cacheService.set('stock:price:000660', 2);
    await cacheService.set('stock:master:all', []);
    await cacheService.set('crypto:ticker:BTC', 3);

    await cacheService.deleteByPattern('stock:price:*');

    expect(await cacheService.get('stock:price:005930')).toBeNull();
    expect(await cacheService.get('stock:price:000660')).toBeNull();
    expect(await cacheService.get('stock:master:all')).toEqual([]);
    expect(await cacheService.get('crypto:ticker:BTC')).toBe(3);
  });

  it('deleteByPattern with no matches is a no-op', async () => {
    await cacheService.set('test:keep', 'x');
    await cacheService.deleteByPattern('nothing:matches:*');
    expect(await cacheService.get('test:keep')).toBe('x');
  });

  it('overwrite existing key with new value', async () => {
    await cacheService.set('test:overwrite', 'first');
    await cacheService.set('test:overwrite', 'second');
    expect(await cacheService.get('test:overwrite')).toBe('second');
  });
});

describe('CacheKeys', () => {
  it('stockPrice builds per-code key', () => {
    expect(CacheKeys.stockPrice('005930')).toBe('stock:price:005930');
  });

  it('stockMaster uses fixed key', () => {
    expect(CacheKeys.stockMaster()).toBe('stock:master:all');
  });

  it('articles sorts and filters params deterministically', () => {
    const a = CacheKeys.articles({ category: 'domestic', page: '2', sort: undefined });
    const b = CacheKeys.articles({ sort: undefined, page: '2', category: 'domestic' });
    expect(a).toBe(b);
    expect(a).toBe('articles:list:category=domestic&page=2');
  });

  it('aiItArticles sorts params deterministically', () => {
    const a = CacheKeys.aiItArticles({ page: '1', limit: '10' });
    const b = CacheKeys.aiItArticles({ limit: '10', page: '1' });
    expect(a).toBe(b);
    expect(a).toBe('ai-it:articles:list:limit=10&page=1');
  });

  it('crypto/forex/global keys compose correctly', () => {
    expect(CacheKeys.cryptoTicker('BTC')).toBe('crypto:ticker:BTC');
    expect(CacheKeys.exchangeRate('USD', 'KRW')).toBe('forex:rate:USD:KRW');
    expect(CacheKeys.globalIndex('SPX')).toBe('global:index:SPX');
  });
});

describe('CacheTTL', () => {
  it('contains all expected TTL values', () => {
    expect(CacheTTL.REALTIME).toBe(10);
    expect(CacheTTL.MINUTE).toBe(60);
    expect(CacheTTL.MINUTE_5).toBe(300);
    expect(CacheTTL.HOUR).toBe(3600);
    expect(CacheTTL.DAY).toBe(86400);
    expect(CacheTTL.AI_SUMMARY).toBe(3600);
  });
});

describe('cacheService distributed locks (DB fallback)', () => {
  it('acquireLock returns true when DB create succeeds', async () => {
    (prisma.distributedLock.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    const acquired = await cacheService.acquireLock('test-lock', 60);
    expect(acquired).toBe(true);
    expect(prisma.distributedLock.deleteMany).toHaveBeenCalledWith({
      where: { lockName: 'test-lock', expiresAt: { lt: expect.any(Date) } },
    });
    expect(prisma.distributedLock.create).toHaveBeenCalledTimes(1);
  });

  it('acquireLock returns false on P2002 unique conflict', async () => {
    (prisma.distributedLock.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
    const acquired = await cacheService.acquireLock('conflict-lock', 60);
    expect(acquired).toBe(false);
  });

  it('acquireLock returns false on unexpected create error', async () => {
    (prisma.distributedLock.create as jest.Mock).mockRejectedValue(new Error('db down'));
    const acquired = await cacheService.acquireLock('err-lock', 60);
    expect(acquired).toBe(false);
  });

  it('acquireLock returns false when cleanup deleteMany fails', async () => {
    (prisma.distributedLock.deleteMany as jest.Mock).mockRejectedValue(new Error('db down'));
    const acquired = await cacheService.acquireLock('cleanup-fail', 60);
    expect(acquired).toBe(false);
    expect(prisma.distributedLock.create).not.toHaveBeenCalled();
  });

  it('releaseLock deletes lock rows', async () => {
    await cacheService.releaseLock('test-lock');
    expect(prisma.distributedLock.deleteMany).toHaveBeenCalledWith({
      where: { lockName: 'test-lock' },
    });
  });

  it('releaseLock swallows delete errors', async () => {
    (prisma.distributedLock.deleteMany as jest.Mock).mockRejectedValue(new Error('db down'));
    await expect(cacheService.releaseLock('test-lock')).resolves.toBeUndefined();
  });
});
