import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiSourceStability')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hours = parseInt(searchParams.get('hours') || '24', 10)
  const threshold = parseInt(searchParams.get('threshold') || '50', 10)

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const logs = await prisma.fetchLog.findMany({
      where: { fetchedAt: { gte: since } },
      select: {
        sourceId: true,
        status: true,
        error: true,
        fetchedAt: true,
      },
    })

    const sourceStats = new Map<
      string,
      { total: number; errors: number; lastError: string | null; lastFetchedAt: Date | null }
    >()

    for (const log of logs) {
      const stats = sourceStats.get(log.sourceId) ?? { total: 0, errors: 0, lastError: null, lastFetchedAt: null }
      stats.total += 1
      if (log.status === 'error' || log.status === 'partial') {
        stats.errors += 1
        stats.lastError = log.error
      }
      if (!stats.lastFetchedAt || log.fetchedAt > stats.lastFetchedAt) {
        stats.lastFetchedAt = log.fetchedAt
      }
      sourceStats.set(log.sourceId, stats)
    }

    const sourceIds = Array.from(sourceStats.keys())
    const sources = await prisma.source.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, name: true, nameEn: true, category: true, sourceType: true },
    })

    const sourceMap = new Map(sources.map((s) => [s.id, s]))

    const stability = Array.from(sourceStats.entries())
      .map(([sourceId, stats]) => {
        const source = sourceMap.get(sourceId)
        const failureRate = stats.total > 0 ? (stats.errors / stats.total) * 100 : 0
        return {
          sourceId,
          name: source?.name ?? sourceId,
          nameEn: source?.nameEn ?? '',
          category: source?.category ?? '',
          sourceType: source?.sourceType ?? '',
          totalFetches: stats.total,
          errorFetches: stats.errors,
          failureRate: Math.round(failureRate * 10) / 10,
          isUnstable: failureRate >= threshold,
          lastError: stats.lastError,
          lastFetchedAt: stats.lastFetchedAt,
        }
      })
      .sort((a, b) => b.failureRate - a.failureRate)

    const unstableSources = stability.filter((s) => s.isUnstable)

    return NextResponse.json({
      success: true,
      data: {
        period: { hours, since },
        threshold,
        totalSources: stability.length,
        unstableCount: unstableSources.length,
        sources: stability,
        unstableSources,
      },
    })
  } catch (error) {
    log.error('Failed to fetch source stability:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch source stability' },
      { status: 500 }
    )
  }
}
