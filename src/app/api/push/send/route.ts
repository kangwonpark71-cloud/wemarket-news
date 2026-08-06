import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import { getSessionUser } from '@/lib/utils/auth'
import { sendToAll, sendToUser, sendKeywordAlert } from '@/lib/services/push/push-service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiPushSend')

/**
 * POST /api/push/send
 * Body:
 *   { mode: "all", title, body, url?, tag? }       → broadcast to all subscribers
 *   { mode: "user", userId, title, body, url? }     → send to one user
 *   { mode: "keyword-alert", userId, articleTitle, matchedKeywords, articleUrl } → keyword alert
 */
export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401)
  }

  try {
    const body = await request.json()
    const { mode } = body

    let result

    switch (mode) {
      case 'all': {
        const { title, body: msgBody, url, tag } = body
        if (!title || !msgBody) {
          return apiError('title and body are required', 400)
        }
        result = await sendToAll({ title, body: msgBody, url, tag })
        break
      }

      case 'user': {
        const { userId, title, body: msgBody, url } = body
        if (!userId || !title || !msgBody) {
          return apiError('userId, title and body are required', 400)
        }
        result = await sendToUser(userId, { title, body: msgBody, url })
        break
      }

      case 'keyword-alert': {
        const { userId, articleTitle, matchedKeywords, articleUrl } = body
        if (!userId || !articleTitle || !matchedKeywords) {
          return apiError('userId, articleTitle and matchedKeywords are required', 400)
        }
        result = await sendKeywordAlert(userId, articleTitle, matchedKeywords, articleUrl)
        break
      }

      default:
        return apiError('Invalid mode. Use "all", "user", or "keyword-alert"', 400)
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    log.error('Push send error:', error)
    return apiError('Failed to send push notification', 500)
  }
}
