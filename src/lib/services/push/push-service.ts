/**
 * Push Notification Service
 * Sends web push notifications to subscribed users via the Web Push Protocol.
 * Uses VAPID keys for authentication — auto-generates if not provided via env.
 */

import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('PushService')

// web-push is a default-export CJS module
let webPush: typeof import('web-push') | null = null
let vapidDetails: { subject: string; publicKey: string; privateKey: string } | null = null

/**
 * Lazy-init web-push with VAPID keys.
 * Generates keys on first call if VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.
 */
async function ensureVapid(): Promise<boolean> {
  if (webPush && vapidDetails) return true

  try {
    webPush = (await import('web-push')).default
  } catch {
    log.error('web-push package not available')
    return false
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@economy-news.app'

  if (publicKey && privateKey) {
    vapidDetails = { subject, publicKey, privateKey }
    webPush.setVapidDetails(subject, publicKey, privateKey)
    return true
  }

  // Auto-generate VAPID keys on first run (dev convenience)
  try {
    const generated = webPush.generateVAPIDKeys()
    vapidDetails = { subject, publicKey: generated.publicKey, privateKey: generated.privateKey }
    webPush.setVapidDetails(subject, generated.publicKey, generated.privateKey)
    log.info('Auto-generated VAPID keys (set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY in production)')
    return true
  } catch (err) {
    log.error('Failed to generate VAPID keys:', err)
    return false
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
  actions?: Array<{ action: string; title: string }>
}

export interface PushSendResult {
  userId: string
  success: boolean
  error?: string
}

/**
 * Send a push notification to a specific user by their push subscription.
 */
export async function sendToUser(
  userId: string,
  payload: PushNotificationPayload,
): Promise<PushSendResult> {
  if (!(await ensureVapid())) {
    return { userId, success: false, error: 'VAPID not configured' }
  }

  const sub = await prisma.pushSubscription.findUnique({
    where: { userId },
  })

  if (!sub) {
    return { userId, success: false, error: 'No push subscription' }
  }

  const subscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keysP256dh,
      auth: sub.auth,
    },
  }

  try {
    await webPush!.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? '/',
        tag: payload.tag ?? 'economy-news',
        actions: payload.actions ?? [
          { action: 'read', title: '읽기' },
          { action: 'close', title: '닫기' },
        ],
      }),
    )
    return { userId, success: true }
  } catch (err: unknown) {
    const error = err as { statusCode?: number; body?: string }
    // 410 Gone / 404 Not Found — subscription is expired; clean it up
    if (error.statusCode === 410 || error.statusCode === 404) {
      await prisma.pushSubscription.deleteMany({ where: { userId } })
      log.warn(`Removed expired push subscription for user ${userId}`)
      return { userId, success: false, error: 'Subscription expired, removed' }
    }
    const msg = error.body ?? String(err)
    log.error(`Push send failed for user ${userId}:`, msg)
    return { userId, success: false, error: msg }
  }
}

/**
 * Send a push notification to all subscribed users.
 * Collects results and returns them.
 */
export async function sendToAll(
  payload: PushNotificationPayload,
): Promise<PushSendResult[]> {
  if (!(await ensureVapid())) return []

  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { id: true, email: true } } },
  })

  log.info(`Sending push to ${subs.length} subscribers: "${payload.title}"`)

  const results = await Promise.allSettled(
    subs.map((sub) => sendToUser(sub.userId, payload)),
  )

  const outcomes: PushSendResult[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { userId: subs[i]?.userId ?? 'unknown', success: false, error: r.reason?.toString() },
  )

  const ok = outcomes.filter((r) => r.success).length
  const failed = outcomes.length - ok
  if (failed > 0) {
    log.warn(`Push send: ${ok} delivered, ${failed} failed`)
  }

  return outcomes
}

/**
 * Send a keyword-alert push notification to a specific user.
 * Convenience wrapper used by keyword-alert-service.
 */
export async function sendKeywordAlert(
  userId: string,
  articleTitle: string,
  matchedKeywords: string[],
  articleUrl: string,
): Promise<PushSendResult> {
  return sendToUser(userId, {
    title: '🔔 키워드 알림',
    body: `"${matchedKeywords.join(', ')}" 관련 새 글: ${articleTitle.length > 60 ? articleTitle.slice(0, 57) + '...' : articleTitle}`,
    url: articleUrl,
    tag: `keyword-alert-${matchedKeywords.join('-')}`,
  })
}
