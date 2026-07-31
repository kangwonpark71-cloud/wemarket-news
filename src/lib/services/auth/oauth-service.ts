/**
 * OAuth Service
 * Handles Google and Kakao social login flows.
 */

import { prisma } from '@/lib/db';
import { createSessionToken } from '@/lib/utils/auth';
// ── Types ──────────────────────────────────────────────────────

export interface OAuthProfile {
  provider: 'GOOGLE' | 'KAKAO';
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// ── Google OAuth ───────────────────────────────────────────────

export function getGoogleAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(code: string): Promise<{ user: { id: string; email: string; name: string }; sessionToken: string } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text().catch(() => 'unknown');
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Get user info
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  const userInfo = await userResponse.json();

  const profile: OAuthProfile = {
    provider: 'GOOGLE',
    providerId: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    avatarUrl: userInfo.picture,
  };

  return upsertOAuthUser(profile);
}

// ── Kakao OAuth ────────────────────────────────────────────────

export function getKakaoAuthUrl(): string {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/kakao/callback`;

  if (!clientId) {
    throw new Error('KAKAO_CLIENT_ID not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  return `https://kauth.kakao.com/oauth/authorize?${params}`;
}

export async function handleKakaoCallback(code: string): Promise<{ user: { id: string; email: string; name: string }; sessionToken: string } | null> {
  const clientId = process.env.KAKAO_CLIENT_ID;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/kakao/callback`;

  if (!clientId) {
    throw new Error('KAKAO_CLIENT_ID not configured');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text().catch(() => 'unknown');
    throw new Error(`Kakao token exchange failed: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Get user info
  const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Kakao user info');
  }

  const userInfo = await userResponse.json();
  const kakaoAccount = userInfo.kakao_account || {};

  const profile: OAuthProfile = {
    provider: 'KAKAO',
    providerId: String(userInfo.id),
    email: kakaoAccount.email || `${userInfo.id}@kakao.local`,
    name: kakaoAccount.profile?.nickname || userInfo.properties?.nickname || 'Kakao User',
    avatarUrl: kakaoAccount.profile?.profile_image_url || userInfo.properties?.profile_image || undefined,
  };

  return upsertOAuthUser(profile);
}

// ── Shared ─────────────────────────────────────────────────────

async function upsertOAuthUser(
  profile: OAuthProfile,
): Promise<{ user: { id: string; email: string; name: string }; sessionToken: string } | null> {
  // Check if social account already exists
  const existingSocial = await prisma.socialAccount.findUnique({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    },
    include: { user: true },
  });

  if (existingSocial) {
    const sessionToken = await createSessionToken(existingSocial.user.id);
    return {
      user: {
        id: existingSocial.user.id,
        email: existingSocial.user.email || profile.email,
        name: existingSocial.user.name || profile.name,
      },
      sessionToken,
    };
  }

  // Check if user with same email exists
  let userId: string;
  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } });

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        role: 'USER',
        password: 'OAUTH_USER_NO_PASSWORD',
      },
    });
    userId = newUser.id;
  }

  // Link social account
  await prisma.socialAccount.create({
    data: {
      userId,
      provider: profile.provider,
      providerId: profile.providerId,
      avatarUrl: profile.avatarUrl,
    },
  });

  const sessionToken = await createSessionToken(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) throw new Error('User creation failed');

  return { user: { id: user.id, email: user.email || profile.email, name: user.name || profile.name }, sessionToken };
}
