import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { getSessionUser } from '@/lib/utils/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiAdminPushStats')

export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401)
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
    return apiError('Failed to fetch push stats', 500)
  }
}
