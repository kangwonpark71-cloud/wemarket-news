import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { theme, language, hiddenSources, pinnedSources, name, email } = body;

    if (name !== undefined || email !== undefined) {
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
        },
      });
    }

    const updated = await prisma.userPreference.upsert({
      where: { userId: sessionUser.id },
      update: {
        theme,
        language,
        hiddenSources,
        pinnedSources,
      },
      create: {
        userId: sessionUser.id,
        theme: theme || 'light',
        language: language || 'all',
        hiddenSources: hiddenSources || '',
        pinnedSources: pinnedSources || '',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
