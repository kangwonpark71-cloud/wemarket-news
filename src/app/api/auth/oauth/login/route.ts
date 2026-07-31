import { NextResponse } from 'next/server';
import { getGoogleAuthUrl, getKakaoAuthUrl } from '@/lib/services/auth/oauth-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiOAuthLogin');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  try {
    let url: string;

    switch (provider) {
      case 'google':
        url = getGoogleAuthUrl();
        break;
      case 'kakao':
        url = getKakaoAuthUrl();
        break;
      default:
        return NextResponse.redirect(new URL('/login?error=invalid_provider', request.url));
    }

    return NextResponse.redirect(url);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error('OAuth login error:', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
