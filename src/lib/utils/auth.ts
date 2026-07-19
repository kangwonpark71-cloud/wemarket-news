import crypto from 'crypto';
import { prisma } from '@/lib/db';
import type { User, UserRole } from '@prisma/client';

const SECRET = process.env.JWT_SECRET || 'economy-news-super-secret-key-123!';

export type { UserRole };

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SECRET).digest('hex');
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const payload = Buffer.from(parts[0], 'base64').toString('utf8');
    const signature = parts[1];
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

    if (signature !== expectedSignature) return null;

    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;

    return parsed.userId;
  } catch {
    return null;
  }
}

export function getSessionFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => c.trim().split('=') as [string, string])
  );
  return cookies['session'] || null;
}

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'role'>;

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = getSessionFromCookie(request);
  if (!token) return null;

  const userId = verifySessionToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return user;
}
