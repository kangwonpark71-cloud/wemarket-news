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
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

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
