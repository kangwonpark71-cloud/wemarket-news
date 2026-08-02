/**
 * auth.test.ts
 * Tests for password hashing, HMAC tokens, session helpers.
 */
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  createHmacToken,
  verifyHmacToken,
  getSessionFromCookie,
  verifySessionToken,
  getSessionUser,
  destroySession,
  destroyAllUserSessions,
  createSessionToken,
} from '@/lib/utils/auth';
import { sessionStore } from '@/lib/services/session/session-store';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterEach(() => {
  process.env = { ...originalEnv };
  jest.restoreAllMocks();
});

describe('hashPassword / verifyPassword', () => {
  it('verifies a freshly hashed password', () => {
    const hash = hashPassword('password123');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('password123', hash)).toBe(true);
  });

  it('rejects wrong password', () => {
    const hash = hashPassword('password123');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces unique salts per hash', () => {
    const a = hashPassword('same');
    const b = hashPassword('same');
    expect(a).not.toBe(b);
    expect(verifyPassword('same', a)).toBe(true);
    expect(verifyPassword('same', b)).toBe(true);
  });

  it('returns false for null/undefined/malformed hash', () => {
    expect(verifyPassword('x', null)).toBe(false);
    expect(verifyPassword('x', undefined)).toBe(false);
    expect(verifyPassword('x', 'not-a-scrypt-hash')).toBe(false);
    expect(verifyPassword('x', 'scrypt$onlysalt')).toBe(false);
  });
});

describe('createHmacToken / verifyHmacToken', () => {
  it('roundtrip returns userId', () => {
    const token = createHmacToken('user-1');
    expect(verifyHmacToken(token)).toBe('user-1');
  });

  it('returns null for tampered token', () => {
    const token = createHmacToken('user-1');
    const [payload, sig] = token.split('.');
    const parsed = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    parsed.userId = 'user-2';
    const tamperedPayload = Buffer.from(JSON.stringify(parsed)).toString('base64');
    const tampered = tamperedPayload + '.' + sig;
    expect(verifyHmacToken(tampered)).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(verifyHmacToken('garbage')).toBeNull();
    expect(verifyHmacToken('')).toBeNull();
    expect(verifyHmacToken('a.b.c')).toBeNull();
  });

  it('returns null for expired token', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = createHmacToken('user-1');
    jest.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    expect(verifyHmacToken(token)).toBeNull();
    jest.useRealTimers();
  });
});

describe('getSessionFromCookie', () => {
  it('extracts session token from cookie header', () => {
    const req = { headers: { get: () => 'session=abc123; theme=dark' } } as unknown as Request;
    expect(getSessionFromCookie(req)).toBe('abc123');
  });

  it('returns null when no session cookie', () => {
    const req = { headers: { get: () => 'theme=dark' } } as unknown as Request;
    expect(getSessionFromCookie(req)).toBeNull();
  });

  it('returns null when no cookie header', () => {
    const req = { headers: { get: () => null } } as unknown as Request;
    expect(getSessionFromCookie(req)).toBeNull();
  });
});

describe('verifySessionToken', () => {
  it('returns userId for valid session', async () => {
    jest.spyOn(sessionStore, 'getSession').mockResolvedValue({ userId: 'user-1', createdAt: Date.now() });
    jest.spyOn(sessionStore, 'extendSession').mockResolvedValue(true);
    expect(await verifySessionToken('valid-token')).toBe('user-1');
  });

  it('returns null for unknown session', async () => {
    jest.spyOn(sessionStore, 'getSession').mockResolvedValue(null);
    expect(await verifySessionToken('unknown-token')).toBeNull();
  });

  it('falls back to legacy HMAC token', async () => {
    jest.spyOn(sessionStore, 'getSession').mockResolvedValue(null);
    jest.spyOn(sessionStore, 'createSession').mockResolvedValue('new-session-id');
    const legacy = createHmacToken('legacy-user');
    expect(await verifySessionToken(legacy)).toBe('legacy-user');
    expect(sessionStore.createSession).toHaveBeenCalledWith('legacy-user');
  });

  it('returns null when both session and HMAC fail', async () => {
    jest.spyOn(sessionStore, 'getSession').mockResolvedValue(null);
    expect(await verifySessionToken('totally-invalid')).toBeNull();
  });
});

describe('getSessionUser', () => {
  it('returns user from session', async () => {
    jest.spyOn(sessionStore, 'getSession').mockResolvedValue({ userId: 'user-1', createdAt: Date.now() });
    jest.spyOn(sessionStore, 'extendSession').mockResolvedValue(true);
    const user = { id: 'user-1', email: 'a@b.com', name: 'A', role: 'USER', phone: null, phoneVerified: false };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    const req = { headers: { get: () => 'session=valid' } } as unknown as Request;
    expect(await getSessionUser(req)).toEqual(user);
  });

  it('returns null when not authenticated', async () => {
    const req = { headers: { get: () => null } } as unknown as Request;
    expect(await getSessionUser(req)).toBeNull();
  });
});

describe('destroySession / destroyAllUserSessions', () => {
  it('delegates to sessionStore.deleteSession', async () => {
    const spy = jest.spyOn(sessionStore, 'deleteSession').mockResolvedValue(undefined);
    await destroySession('session-1');
    expect(spy).toHaveBeenCalledWith('session-1');
  });

  it('delegates to sessionStore.deleteAllUserSessions', async () => {
    const spy = jest.spyOn(sessionStore, 'deleteAllUserSessions').mockResolvedValue(undefined);
    await destroyAllUserSessions('user-1');
    expect(spy).toHaveBeenCalledWith('user-1');
  });
});

describe('getSecret / token edge cases', () => {
  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => createHmacToken('user-1')).toThrow('JWT_SECRET');
    expect(verifyHmacToken('any.token')).toBeNull();
  });

  it('returns false for empty salt or expected hash', () => {
    expect(verifyPassword('x', 'scrypt$$')).toBe(false);
    expect(verifyPassword('x', 'scrypt$00$')).toBe(false);
  });

  it('returns null when signature length mismatches', () => {
    const token = createHmacToken('user-1');
    const [payload] = token.split('.');
    expect(verifyHmacToken(`${payload}.short`)).toBeNull();
  });

  it('returns null when payload is not valid JSON', () => {
    const notJson = Buffer.from('not-json').toString('base64');
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET as string).update(Buffer.from('not-json').toString('base64')).digest('hex');
    expect(verifyHmacToken(`${notJson}.${sig}`)).toBeNull();
  });

  it('createSessionToken delegates to sessionStore.createSession', async () => {
    const spy = jest.spyOn(sessionStore, 'createSession').mockResolvedValue('session-id');
    await expect(createSessionToken('user-1')).resolves.toBe('session-id');
    expect(spy).toHaveBeenCalledWith('user-1');
  });
});
