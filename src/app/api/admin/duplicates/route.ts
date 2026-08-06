import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { getSessionUser } from '@/lib/utils/auth'
import { mergeDuplicates, getDuplicateStats } from '@/lib/services/duplicate/duplicate-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminDuplicates')

/**
 * POST /api/admin/duplicates
 * Trigger duplicate article merge.
 * Body: { dryRun?: boolean } — dryRun=true to preview without deleting.
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401)
  }

  try {
    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun === true

    const result = await mergeDuplicates(dryRun)
    log.info(`Duplicate merge ${dryRun ? '(dry-run)' : ''}: ${result.totalGroups} groups, ${result.totalDuplicates} duplicates`)

    return NextResponse.json({
      success: true,
      data: {
        dryRun,
        totalGroups: result.totalGroups,
        totalDuplicates: result.totalDuplicates,
        groups: result.groups.slice(0, 50), // Limit preview to 50 groups
        errors: result.errors,
        message: dryRun
          ? `🔍 발견: ${result.totalGroups}개 중복그룹, ${result.totalDuplicates}개 중복기사`
          : `✅ 병합 완료: ${result.totalGroups}개 중복그룹, ${result.totalDuplicates}개 기사 병합`,
      },
    })
  } catch (error) {
    log.error('Failed to merge duplicates:', error)
    return apiError('Failed to merge duplicates', 500)
  }
}

/**
 * GET /api/admin/duplicates
 * Get duplicate statistics (count of potential duplicates).
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401)
  }

  try {
    const stats = await getDuplicateStats()
    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    log.error('Failed to get duplicate stats:', error)
    return apiError('Failed to get duplicate stats', 500)
  }
}
