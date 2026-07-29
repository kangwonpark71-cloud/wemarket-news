import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/utils/auth'
import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiPushSubscribe')

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 },
      )
    }

    const { endpoint, keys } = subscription

    await prisma.pushSubscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        endpoint,
        keysP256dh: keys?.p256dh ?? '',
        auth: keys?.auth ?? '',
      },
      update: {
        endpoint,
        keysP256dh: keys?.p256dh ?? '',
        auth: keys?.auth ?? '',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Push subscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await prisma.pushSubscription.findUnique({
      where: { userId: user.id },
      select: { endpoint: true },
    })

    return NextResponse.json({ success: true, subscribed: !!sub })
  } catch (error) {
    log.error('Push status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check subscription' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Push unsubscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 },
    )
  }
}
