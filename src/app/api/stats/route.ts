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
      sourceHealth,
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
      prisma.source.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nameEn: true,
          category: true,
          sourceType: true,
          _count: { select: { articles: true, fetchLogs: true } },
          fetchLogs: {
            orderBy: { fetchedAt: 'desc' },
            take: 10,
            select: { status: true, fetchedAt: true, count: true, newCount: true, duration: true },
          },
        },
      }),
    ])

    const sourceHealthData = sourceHealth.map(source => {
      const logs = source.fetchLogs;
      const successCount = logs.filter(l => l.status === 'success' || l.status === 'partial').length;
      const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
      const lastLog = logs[0];

      return {
        id: source.id,
        name: source.name,
        nameEn: source.nameEn,
        category: source.category,
        sourceType: source.sourceType,
        articleCount: source._count.articles,
        fetchCount: source._count.fetchLogs,
        successRate,
        lastFetchAt: lastLog?.fetchedAt || null,
        lastFetchStatus: lastLog?.status || null,
        lastFetchCount: lastLog?.count || 0,
        avgDuration: logs.length > 0
          ? Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length)
          : null,
      };
    });

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
        sourceHealth: sourceHealthData,
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