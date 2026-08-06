import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAuthMe')

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return apiError('Unauthorized or expired session', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        preferences: {
          select: {
            theme: true,
            language: true,
            hiddenSources: true,
            pinnedSources: true,
          },
        },
      },
    });

    if (!user) {
      return apiError('User not found', 404);
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    log.error('Me endpoint error:', error);
    return apiError('Server error', 500);
  }
}
