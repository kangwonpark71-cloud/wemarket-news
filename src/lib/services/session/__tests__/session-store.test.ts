import { sessionStore } from '../session-store'

/**
 * SessionStore tests — in-memory mode (REDIS_URL unset in test env).
 * We re-create a fresh instance per group using the singleton's constructor
 * so state is isolated between groups.
 */
const SessionStoreClass = sessionStore.constructor as new () => {
  createSession(userId: string): Promise<string>
  getSession(sessionId: string): Promise<{ userId: string; createdAt: number } | null>
  deleteSession(sessionId: string): Promise<void>
  deleteAllUserSessions(userId: string): Promise<void>
  extendSession(sessionId: string): Promise<boolean>
  stopCleanupInterval(): void
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Redis instances created during tests (populated by the ioredis mock).
const mockRedisInstances: Array<{
  connect: jest.Mock
  get: jest.Mock
  setex: jest.Mock
  del: jest.Mock
  scan: jest.Mock
  exists: jest.Mock
  expire: jest.Mock
  emit: (event: string, ...args: unknown[]) => void
}> = []

jest.mock('ioredis', () => {
  class MockRedis {
    listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
    connect = jest.fn(async () => {
      this.emit('connect')
    })
    get = jest.fn()
    setex = jest.fn()
    del = jest.fn()
    scan = jest.fn()
    exists = jest.fn()
    expire = jest.fn()

    constructor(...args: unknown[]) {
      void args
      mockRedisInstances.push(this as never)
    }

    on(event: string, cb: (...args: unknown[]) => void) {
      if (!this.listeners[event]) this.listeners[event] = []
      this.listeners[event].push(cb)
      return this
    }

    emit(event: string, ...args: unknown[]) {
      ;(this.listeners[event] ?? []).forEach((cb) => cb(...args))
    }
  }
  return { __esModule: true, default: MockRedis }
})

describe('SessionStore', () => {
  let store: InstanceType<typeof SessionStoreClass>

  beforeEach(() => {
    store = new SessionStoreClass()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('createSession', () => {
    it('should return a 64-char hex session id', async () => {
      const id = await store.createSession('user-1')
      expect(id).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should generate unique ids for consecutive calls', async () => {
      const id1 = await store.createSession('user-1')
      const id2 = await store.createSession('user-1')
      expect(id1).not.toBe(id2)
    })
  })

  describe('getSession', () => {
    it('should return stored session data', async () => {
      const id = await store.createSession('user-1')
      const data = await store.getSession(id)
      expect(data).not.toBeNull()
      expect(data!.userId).toBe('user-1')
      expect(data!.createdAt).toBeGreaterThan(0)
    })

    it('should return null for an unknown session id', async () => {
      expect(await store.getSession('does-not-exist')).toBeNull()
    })

    it('should return null for an expired session', async () => {
      jest.useFakeTimers()
      const id = await store.createSession('user-1')
      jest.advanceTimersByTime(SESSION_TTL_MS + 1000)
      expect(await store.getSession(id)).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('should remove the session', async () => {
      const id = await store.createSession('user-1')
      await store.deleteSession(id)
      expect(await store.getSession(id)).toBeNull()
    })

    it('should not throw for a missing session', async () => {
      await expect(store.deleteSession('nope')).resolves.toBeUndefined()
    })
  })

  describe('extendSession', () => {
    it('should return true for an existing session', async () => {
      const id = await store.createSession('user-1')
      expect(await store.extendSession(id)).toBe(true)
    })

    it('should return false for a missing session', async () => {
      expect(await store.extendSession('missing')).toBe(false)
    })

    it('should reset the expiry window', async () => {
      jest.useFakeTimers()
      const id = await store.createSession('user-1')
      // Advance close to the TTL but not past it
      jest.advanceTimersByTime(SESSION_TTL_MS - 60_000)
      expect(await store.getSession(id)).not.toBeNull()
      // Extend, then advance past the original TTL — should still be alive
      await store.extendSession(id)
      jest.advanceTimersByTime(60_000)
      expect(await store.getSession(id)).not.toBeNull()
    })
  })

  describe('deleteAllUserSessions', () => {
    it('should remove every session for the given user', async () => {
      const id1 = await store.createSession('user-1')
      const id2 = await store.createSession('user-1')
      await store.createSession('user-2')

      await store.deleteAllUserSessions('user-1')

      expect(await store.getSession(id1)).toBeNull()
      expect(await store.getSession(id2)).toBeNull()
    })

    it('should keep other users sessions intact', async () => {
      const otherId = await store.createSession('user-2')
      await store.createSession('user-1')

      await store.deleteAllUserSessions('user-1')

      expect(await store.getSession(otherId)).not.toBeNull()
    })

    it('should not throw when the user has no sessions', async () => {
      await expect(store.deleteAllUserSessions('ghost-user')).resolves.toBeUndefined()
    })
  })
})

describe('SessionStore (Redis mode)', () => {
  let store: InstanceType<typeof SessionStoreClass>
  let redis: (typeof mockRedisInstances)[number]

  beforeEach(async () => {
    process.env.REDIS_URL = 'redis://test:6379'
    jest.clearAllMocks()
    store = new SessionStoreClass()
    await new Promise((resolve) => setTimeout(resolve, 0))
    redis = mockRedisInstances[mockRedisInstances.length - 1]
  })

  afterEach(() => {
    store.stopCleanupInterval()
    delete process.env.REDIS_URL
    jest.useRealTimers()
  })

  it('should create a session via SETEX', async () => {
    redis.setex.mockResolvedValue('OK')
    const id = await store.createSession('user-1')
    expect(redis.setex).toHaveBeenCalledWith(
      `economy-news:session:${id}`,
      7 * 24 * 60 * 60,
      expect.stringContaining('user-1')
    )
  })

  it('should read a session from Redis', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ userId: 'user-1', createdAt: 123 }))
    const data = await store.getSession('abc')
    expect(redis.get).toHaveBeenCalledWith('economy-news:session:abc')
    expect(data).toEqual({ userId: 'user-1', createdAt: 123 })
  })

  it('should return null when Redis has no session', async () => {
    redis.get.mockResolvedValue(null)
    await expect(store.getSession('abc')).resolves.toBeNull()
  })

  it('should delete via Redis DEL', async () => {
    await store.deleteSession('abc')
    expect(redis.del).toHaveBeenCalledWith('economy-news:session:abc')
  })

  it('should extend an existing session via EXISTS + EXPIRE', async () => {
    redis.exists.mockResolvedValue(1)
    await expect(store.extendSession('abc')).resolves.toBe(true)
    expect(redis.expire).toHaveBeenCalledWith('economy-news:session:abc', 7 * 24 * 60 * 60)
  })

  it('should return false when the session does not exist in Redis', async () => {
    redis.exists.mockResolvedValue(0)
    await expect(store.extendSession('abc')).resolves.toBe(false)
  })

  it('should delete only the target users sessions via SCAN + GET + DEL', async () => {
    redis.scan.mockResolvedValueOnce([
      '0',
      ['economy-news:session:one', 'economy-news:session:two'],
    ])
    redis.get
      .mockResolvedValueOnce(JSON.stringify({ userId: 'user-1', createdAt: 1 }))
      .mockResolvedValueOnce(JSON.stringify({ userId: 'user-2', createdAt: 1 }))
    await store.deleteAllUserSessions('user-1')
    expect(redis.del).toHaveBeenCalledWith('economy-news:session:one')
    expect(redis.del).not.toHaveBeenCalledWith('economy-news:session:two')
  })

  it('should fall back to memory when Redis set fails', async () => {
    redis.setex.mockRejectedValueOnce(new Error('boom'))
    redis.get.mockRejectedValue(new Error('boom'))
    const id = await store.createSession('user-1')
    const data = await store.getSession(id)
    expect(data?.userId).toBe('user-1')
  })
})
