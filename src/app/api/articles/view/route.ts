import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticlesView')

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return apiError('Article ID is required', 400);
    }

    await prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { id: true, viewCount: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Failed to track view:', error);
    return apiError('Failed to track view', 500);
  }
}
