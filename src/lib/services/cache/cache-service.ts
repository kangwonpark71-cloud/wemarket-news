/**
 * Cache Service - Redis with In-Memory Fallback
 * Provides caching layer for financial data to minimize external API calls
 */

import { prisma } from '@/lib/db';
import type { Redis } from 'ioredis';

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: unknown; expiresAt: number }> = new Map();
  private useRedis = false;
  private defaultTtl = 300;

  constructor() {
    this.initRedis();
    this.startCleanupInterval();
  }

  private async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });
        this.redis = redis;

        redis.on('connect', () => {
          this.useRedis = true;
        });

        redis.on('error', (err: Error) => {
          this.useRedis = false;
          console.warn('[Cache] Redis error, falling back to memory:', err.message);
        });

        await redis.connect();
      } else {
      }
    } catch (error) {
      console.warn('[Cache] Failed to initialize Redis, using in-memory cache:', error);
    }
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt < now) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `economy-news:cache:${key}`;

    if (this.useRedis && this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        if (value) return JSON.parse(value) as T;
      } catch (error) {
        console.warn('[Cache] Redis get failed, falling back to memory:', error);
      }
    }

    const entry = this.memoryCache.get(fullKey);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value as T;
    }
    if (entry) {
      this.memoryCache.delete(fullKey);
    }
    return null;
  }

  async set(key: string, value: unknown, options: { ttl?: number } = {}): Promise<void> {
    const fullKey = `economy-news:cache:${key}`;
    const ttl = options.ttl ?? this.defaultTtl;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
        return;
      } catch (error) {
        console.warn('[Cache] Redis set failed, falling back to memory:', error);
      }
    }

    this.memoryCache.set(fullKey, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    const fullKey = `economy-news:cache:${key}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(fullKey);
      } catch (error) {
        console.warn('[Cache] Redis delete failed:', error);
      }
    }

    this.memoryCache.delete(fullKey);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const fullPattern = `economy-news:cache:${pattern}`;

    if (this.useRedis && this.redis) {
      try {
        // SCAN instead of KEYS to avoid blocking Redis on large key spaces.
        const keys: string[] = [];
        let cursor = '0';
        do {
          const [nextCursor, found] = await this.redis.scan(
            cursor,
            'MATCH',
            fullPattern,
            'COUNT',
            100,
          );
          cursor = nextCursor;
          if (found.length > 0) keys.push(...found);
        } while (cursor !== '0');

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn('[Cache] Redis deleteByPattern failed:', error);
      }
    }

    const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Acquire a distributed lock with automatic expiration (TTL)
   * Uses Redis NX option if connected, otherwise falls back to memory cache
   */
  async acquireLock(lockName: string, ttlSeconds: number = 300): Promise<boolean> {
    const fullKey = `economy-news:lock:${lockName}`;
    const uniqueVal = `${Date.now()}-${Math.random()}`;

    if (this.useRedis && this.redis) {
      try {
        const result = await this.redis.set(fullKey, uniqueVal, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (error) {
        console.warn('[Cache] Redis acquireLock failed:', error);
      }
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
      const owner = uniqueVal;

      await prisma.distributedLock.deleteMany({
        where: {
          lockName,
          expiresAt: { lt: now },
        },
      });

      try {
        await prisma.distributedLock.create({
          data: {
            lockName,
            owner,
            expiresAt,
          },
        });
        return true;
      } catch (createErr) {
        // Unique constraint (P2002): another instance already holds the lock.
        // This is the expected "lock not acquired" case, not an error.
        if ((createErr as { code?: string })?.code === 'P2002') {
          return false;
        }
        throw createErr;
      }
    } catch (err) {
      console.warn('[Cache] Non-Redis acquireLock failed:', err);
      return false;
    }
  }

  async releaseLock(lockName: string): Promise<void> {
    const fullKey = `economy-news:lock:${lockName}`;
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(fullKey);
        return;
      } catch (error) {
        console.warn('[Cache] Redis releaseLock failed:', error);
      }
    }

    try {
      await prisma.distributedLock.deleteMany({
        where: { lockName },
      });
    } catch {
    }

    this.memoryCache.delete(fullKey);
  }
}

export const cacheService = new CacheService();

export const CacheKeys = {
  stockPrice: (code: string) => `stock:price:${code}`,
  stockPrices: (market: string) => `stock:prices:${market}`,
  stockDailyStat: (date: string, market: string) => `stock:daily:${date}:${market}`,
  stockMaster: () => `stock:master:all`,

  cryptoTicker: (symbol: string) => `crypto:ticker:${symbol}`,
  cryptoTickers: () => `crypto:tickers:all`,
  cryptoCandle: (symbol: string, unit: string) => `crypto:candle:${symbol}:${unit}`,
  cryptoCandles: (symbol: string, unit: string) => `crypto:candles:${symbol}:${unit}`,
  cryptoDailyStat: (date: string) => `crypto:daily:${date}`,
  cryptoMaster: () => `crypto:master:all`,
  cryptoMarkets: () => `crypto:markets:all`,
  cryptoTopVolume: (limit: number) => `crypto:top:volume:${limit}`,
  cryptoTopGainers: (limit: number) => `crypto:top:gainers:${limit}`,
  cryptoTopLosers: (limit: number) => `crypto:top:losers:${limit}`,

  exchangeRate: (base: string, quote: string) => `forex:rate:${base}:${quote}`,
  forexDailyStat: (date: string) => `forex:daily:${date}`,

  globalIndex: (symbol: string) => `global:index:${symbol}`,
  globalIndices: () => `global:indices:all`,

  chartData: (symbol: string, type: string, timeframe: string) => `chart:${type}:${symbol}:${timeframe}`,

  financialDashboard: () => `financial:dashboard`,
};

export const CacheTTL = {
  REALTIME: 10,
  MINUTE: 60,
  MINUTE_5: 300,
  MINUTE_15: 900,
  MINUTE_30: 1800,
  HOUR: 3600,
  HOUR_12: 43200,
  DAY: 86400,
} as const;
