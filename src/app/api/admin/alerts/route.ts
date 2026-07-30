import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/utils/auth'
import {
  getAlertUsers,
  checkAlerts,
  dispatchAlerts,
} from '@/lib/services/alerts/keyword-alert-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminAlerts')

/**
 * GET /api/admin/alerts
 * Returns alert configuration summary (users with keywords, etc.)
 */
export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const alertUsers = await getAlertUsers()
    return NextResponse.json({
      success: true,
      data: {
        alertUsers,
        totalConfigured: alertUsers.length,
      },
    })
  } catch (error) {
    log.error('Failed to fetch alert config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alert configuration' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/alerts
 * Trigger keyword alert check or dispatch.
 * Body: { action: 'check' | 'dispatch', hoursBack?: number }
 */
export async function POST(request: Request) {
  const admin = await getSessionUser(request)
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action: string = body.action ?? 'check'
    const hoursBack: number = body.hoursBack ?? 24

    if (action === 'check') {
      const result = await checkAlerts(hoursBack)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'dispatch') {
      const result = await dispatchAlerts(hoursBack)
      return NextResponse.json({
        success: true,
        data: { dispatched: result.dispatched, message: `${result.dispatched} alerts dispatched.` },
      })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    log.error('Alert action failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process alert action' },
      { status: 500 },
    )
  }
}
