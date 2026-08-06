import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticles[id]Read')

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const article = await prisma.article.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true },
    })

    return NextResponse.json({
      success: true,
      data: article,
    })
  } catch (error) {
    log.error('Failed to mark as read:', error)
    return apiError('Failed to mark as read', 500)
  }
}