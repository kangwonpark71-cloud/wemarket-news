import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalArticles,
      totalSources,
      totalActiveSources,
      totalUsers,
      totalFetchLogs,
      totalFinancialLogs,
      recentErrors,
      lastRssFetch,
      lastAiitFetch,
      lastFinancialFetch,
      errorCount24h,
      articlesByCategory,
      articlesBySourceType,
      dbConnectionOk,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.source.count(),
      prisma.source.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.fetchLog.count(),
      prisma.financialFetchLog.count(),
      prisma.fetchLog.findMany({
        where: { status: 'error', fetchedAt: { gte: oneDayAgo } },
        orderBy: { fetchedAt: 'desc' },
        take: 10,
        include: { source: { select: { name: true } } },
      }),
      prisma.fetchLog.findFirst({
        where: { source: { sourceType: 'RSS' } },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true, status: true, count: true, newCount: true },
      }),
      prisma.fetchLog.findFirst({
        where: { source: { sourceType: 'AI_IT' } },
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true, status: true, count: true, newCount: true },
      }),
      prisma.financialFetchLog.findFirst({
        orderBy: { fetchedAt: 'desc' },
        select: { fetchedAt: true, status: true, service: true },
      }),
      prisma.fetchLog.count({
        where: { status: 'error', fetchedAt: { gte: oneDayAgo } },
      }),
      prisma.article.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { _count: { category: 'desc' } },
      }),
      prisma.article.groupBy({
        by: ['sourceType'],
        _count: true,
      }),
      prisma.$queryRaw`SELECT 1 as ok`.then(() => true).catch(() => false),
    ]);

    const rssStatus = !lastRssFetch
      ? 'pending'
      : Date.now() - lastRssFetch.fetchedAt.getTime() > 4 * 60 * 60 * 1000
        ? 'warning'
        : 'healthy';

    const aiitStatus = !lastAiitFetch
      ? 'pending'
      : Date.now() - lastAiitFetch.fetchedAt.getTime() > 2 * 60 * 60 * 1000
        ? 'warning'
        : 'healthy';

    return NextResponse.json({
      success: true,
      data: {
        database: { connected: dbConnectionOk },
        totals: {
          articles: totalArticles,
          sources: { total: totalSources, active: totalActiveSources, inactive: totalSources - totalActiveSources },
          users: totalUsers,
          fetchLogs: totalFetchLogs,
          financialLogs: totalFinancialLogs,
        },
        schedulers: {
          rss: {
            status: rssStatus,
            lastRun: lastRssFetch?.fetchedAt || null,
            lastStatus: lastRssFetch?.status || null,
            lastCount: lastRssFetch?.count || 0,
            lastNewCount: lastRssFetch?.newCount || 0,
          },
          aiit: {
            status: aiitStatus,
            lastRun: lastAiitFetch?.fetchedAt || null,
            lastStatus: lastAiitFetch?.status || null,
            lastCount: lastAiitFetch?.count || 0,
            lastNewCount: lastAiitFetch?.newCount || 0,
          },
          financial: {
            lastRun: lastFinancialFetch?.fetchedAt || null,
            lastStatus: lastFinancialFetch?.status || null,
            lastService: lastFinancialFetch?.service || null,
          },
        },
        errors: {
          last24h: errorCount24h,
          recent: recentErrors.map((e) => ({
            id: e.id,
            sourceName: e.source?.name || e.sourceId,
            status: e.status,
            error: e.error,
            fetchedAt: e.fetchedAt,
          })),
        },
        distribution: {
          byCategory: articlesByCategory.map((c) => ({ category: c.category, count: c._count })),
          bySourceType: articlesBySourceType.map((s) => ({ sourceType: s.sourceType, count: s._count })),
        },
      },
    });
  } catch (error) {
    console.error('Health endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get system health' },
      { status: 500 }
    );
  }
}
