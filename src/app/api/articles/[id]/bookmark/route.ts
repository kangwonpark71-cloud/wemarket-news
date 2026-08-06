import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticles[id]Bookmark')

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const article = await prisma.article.findUnique({
      where: { id },
      select: { isBookmarked: true },
    })

    if (!article) {
      return apiError('Article not found', 404)
    }

    const updated = await prisma.article.update({
      where: { id },
      data: { isBookmarked: !article.isBookmarked },
      select: { id: true, isBookmarked: true },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    log.error('Failed to toggle bookmark:', error)
    return apiError('Failed to toggle bookmark', 500)
  }
}