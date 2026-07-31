import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSessionUser } from '@/lib/utils/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminPushStats')

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscriberCount = await prisma.pushSubscription.count()
    return NextResponse.json({
      success: true,
      data: {
        subscriberCount,
        vapidConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      },
    })
  } catch (error) {
    log.error('Push stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch push stats' },
      { status: 500 },
    )
  }
}
