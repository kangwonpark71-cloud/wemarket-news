import crypto from 'crypto';
import type { Redis } from 'ioredis';
import { createLogger } from '@/lib/logger';

const log = createLogger('SessionStore');

const SESSION_PREFIX = 'economy-news:session:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionData {
  userId: string;
  createdAt: number;
}

class SessionStore {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { data: SessionData; expiresAt: number }> = new Map();
  private useRedis = false;

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
          log.info('Redis connected');
        });

        redis.on('error', (err: Error) => {
          this.useRedis = false;
          log.warn('Redis error, falling back to memory:', err.message);
        });

        await redis.connect();
      }
    } catch (error) {
      log.warn('Failed to initialize Redis, using in-memory session store:', error);
    }
  }

  private startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryStore.entries()) {
        if (entry.expiresAt < now) {
          this.memoryStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createSession(userId: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const data: SessionData = {
      userId,
      createdAt: Date.now(),
    };

    if (this.useRedis && this.redis) {
      try {
        await this.redis.setex(
          `${SESSION_PREFIX}${sessionId}`,
          SESSION_TTL,
          JSON.stringify(data)
        );
        return sessionId;
      } catch (error) {
        log.warn('Redis set failed, falling back to memory:', error)
      }
    }

    this.memoryStore.set(`${SESSION_PREFIX}${sessionId}`, {
      data,
      expiresAt: Date.now() + SESSION_TTL * 1000,
    });
    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = `${SESSION_PREFIX}${sessionId}`;

    if (this.useRedis && this.redis) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value) as SessionData;
        }
        return null;
      } catch (error) {
        log.warn('Redis get failed, falling back to memory:', error)
      }
    }

    const entry = this.memoryStore.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    if (entry) {
      this.memoryStore.delete(key);
    }
    return null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `${SESSION_PREFIX}${sessionId}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        log.warn('Redis delete failed:', error)
      }
    }

    this.memoryStore.delete(key);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        const pattern = `${SESSION_PREFIX}*`;
        const keys: string[] = [];
        let cursor = '0';

        do {
          const [nextCursor, found] = await this.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100
          );
          cursor = nextCursor;
          if (found.length > 0) keys.push(...found);
        } while (cursor !== '0');

        for (const key of keys) {
          const value = await this.redis.get(key);
          if (value) {
            const data = JSON.parse(value) as SessionData;
            if (data.userId === userId) {
              await this.redis.del(key);
            }
          }
        }
      } catch (error) {
        log.warn('Redis deleteAllUserSessions failed:', error)
      }
    }

    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.data.userId === userId) {
        this.memoryStore.delete(key);
      }
    }
  }

  async extendSession(sessionId: string): Promise<boolean> {
    const key = `${SESSION_PREFIX}${sessionId}`;

    if (this.useRedis && this.redis) {
      try {
        const exists = await this.redis.exists(key);
        if (exists) {
          await this.redis.expire(key, SESSION_TTL);
          return true;
        }
        return false;
      } catch (error) {
        log.warn('Redis extend failed:', error)
      }
    }

    const entry = this.memoryStore.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      entry.expiresAt = Date.now() + SESSION_TTL * 1000;
      return true;
    }
    return false;
  }
}

export const sessionStore = new SessionStore();
