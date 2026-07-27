import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sessionStore } from '@/lib/services/session/session-store';
import type { User, UserRole } from '@prisma/client';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set. Refusing to start with an insecure fallback secret.');
  }
  return secret;
}

export type { UserRole };

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = crypto.scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function createHmacToken(userId: string): string {
  const secret = getSecret();
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

export function verifyHmacToken(token: string): string | null {
  try {
    const secret = getSecret();
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const payload = Buffer.from(parts[0], 'base64').toString('utf8');
    const signature = Buffer.from(parts[1] || '', 'utf8');
    const expectedSignature = Buffer.from(
      crypto.createHmac('sha256', secret).update(payload).digest('hex'),
      'utf8',
    );

    if (signature.length !== expectedSignature.length) return null;
    if (!crypto.timingSafeEqual(signature, expectedSignature)) return null;

    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;

    return parsed.userId;
  } catch {
    return null;
  }
}

export async function createSessionToken(userId: string): Promise<string> {
  return sessionStore.createSession(userId);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const session = await sessionStore.getSession(token);
  if (session) {
    await sessionStore.extendSession(token);
    return session.userId;
  }

  const legacyUserId = verifyHmacToken(token);
  if (legacyUserId) {
    // Create a session token for the legacy user (side effect: stores in DB)
    await createSessionToken(legacyUserId);
    return legacyUserId;
  }

  return null;
}

export function getSessionFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => c.trim().split('=') as [string, string])
  );
  return cookies['session'] || null;
}

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone' | 'phoneVerified'>;

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = getSessionFromCookie(request);
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, phone: true, phoneVerified: true },
  });

  return user;
}

export async function destroySession(sessionId: string): Promise<void> {
  await sessionStore.deleteSession(sessionId);
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await sessionStore.deleteAllUserSessions(userId);
}
