import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const [
      totalArticles,
      totalSources,
      lastFetch,
      articlesByCategory,
      recentFetchLogs,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.source.count({ where: { isActive: true } }),
      prisma.fetchLog.findFirst({
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true, status: true, count: true, newCount: true },
      }),
      prisma.article.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
        take: 10,
      }),
      prisma.fetchLog.findMany({
        take: 20,
        orderBy: { fetchedAt: 'desc' },
        include: { source: { select: { name: true, nameEn: true, category: true } } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalArticles,
        totalSources,
        lastFetchAt: lastFetch?.fetchedAt || null,
        lastFetchStatus: lastFetch?.status || null,
        lastFetchCount: lastFetch?.count || 0,
        lastFetchNewCount: lastFetch?.newCount || 0,
        articlesByCategory: articlesByCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        recentFetchLogs,
      },
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}