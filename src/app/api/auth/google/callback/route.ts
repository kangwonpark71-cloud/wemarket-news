import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleGoogleCallback } from '@/lib/services/auth/oauth-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiGoogleCallback');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    log.warn('Google OAuth error or missing code:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  try {
    const result = await handleGoogleCallback(code);
    if (!result) {
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    log.error('Google callback error:', err);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }
}
