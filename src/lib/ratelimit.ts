/**
 * Rate Limiting - Redis with In-Memory Fallback
 * Fixed-window counter per identifier (IP + route). Falls back to per-instance
 * memory when Redis is unavailable.
 */

import type { Redis } from 'ioredis';
import { createLogger } from '@/lib/logger';

const log = createLogger('RateLimit');

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const WINDOW_SECONDS = 60;
const memoryStore = new Map<string, MemoryEntry>();

let redis: Redis | null = null;
let redisReady = false;
let redisInitAttempted = false;

async function getRedis(): Promise<Redis | null> {
  if (redisInitAttempted) {
    return redisReady ? redis : null;
  }
  redisInitAttempted = true;
  try {
    if (!process.env.REDIS_URL) {
      log.info('REDIS_URL not configured, using in-memory rate limit');
      return null;
    }
    const RedisModule = (await import('ioredis')).default;
    const client = new RedisModule(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    client.on('connect', () => {
      redisReady = true;
    });
    client.on('error', (err: Error) => {
      redisReady = false;
      log.warn('Redis rate limit error, falling back to memory:', err.message);
    });
    await client.connect();
    redis = client;
    redisReady = true;
    return redis;
  } catch (error) {
    log.warn('Failed to init Redis rate limit, using memory:', error);
    return null;
  }
}

function memoryCheck(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowSeconds * 1000, retryAfterSeconds: windowSeconds };
  }
  const count = entry.count + 1;
  entry.count = count;
  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export async function checkRateLimit(
  identifier: string,
  options: { limit: number; windowSeconds?: number; prefix?: string } = { limit: 120 },
): Promise<RateLimitResult> {
  const windowSeconds = options.windowSeconds ?? WINDOW_SECONDS;
  const fullKey = `economy-news:rl:${options.prefix ?? 'api'}:${windowSeconds}:${identifier}`;

  const client = await getRedis();
  if (client) {
    try {
      const count = await client.incr(fullKey);
      if (count === 1) {
        await client.expire(fullKey, windowSeconds);
      }
      const resetAt = Date.now() + windowSeconds * 1000;
      return {
        allowed: count <= options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - count),
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
      };
    } catch (error) {
      log.warn('Redis rate limit incr failed, falling back to memory:', error);
    }
  }

  return memoryCheck(fullKey, options.limit, windowSeconds);
}

/** Rate limit lookup for a route path, used by proxy.ts. */
export function limitForPath(pathname: string): number {
  if (/^\/api\/auth\//.test(pathname)) return 30;
  if (/^\/api\/(newsletter|push)\//.test(pathname)) return 20;
  return 120;
}
