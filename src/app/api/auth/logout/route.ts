import { NextResponse } from 'next/server';
import { destroySession, getSessionFromCookie } from '@/lib/utils/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAuthLogout')

export async function POST(request: Request) {
  try {
    const sessionId = getSessionFromCookie(request);
    if (sessionId) {
      await destroySession(sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session');
    return response;
  } catch (error) {
    log.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
