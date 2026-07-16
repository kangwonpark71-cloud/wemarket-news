import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

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
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      )
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
    console.error('Failed to toggle bookmark:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle bookmark' },
      { status: 500 }
    )
  }
}