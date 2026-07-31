/**
 * Keyword Alert Service
 * Matches new articles against user-configured alert keywords.
 * Logs matches for admin review and can trigger push notifications.
 */

import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { sendKeywordAlert } from '@/lib/services/push/push-service'

const log = createLogger('KeywordAlertService')

export interface ArticleMatch {
  articleId: string
  articleTitle: string
  articleUrl: string
  publishedAt: Date
  matchedKeywords: string[]
  userId: string
  userEmail: string
}

export interface AlertCheckResult {
  totalUsers: number
  usersWithAlerts: number
  totalArticles: number
  matches: ArticleMatch[]
}

/**
 * Get users who have configured alert keywords
 */
export async function getAlertUsers() {
  const prefs = await prisma.userPreference.findMany({
    where: {
      alertKeywords: { not: '' },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  })
  return prefs.map((p) => ({
    userId: p.userId,
    email: p.user.email,
    name: p.user.name,
    keywords: p.alertKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    createdAt: p.createdAt,
  }))
}

/**
 * Check recent articles (last N hours) against all user alert keywords.
 * Returns all matches found.
 */
export async function checkAlerts(
  hoursBack: number = 24,
): Promise<AlertCheckResult> {
  const users = await getAlertUsers()
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  const articles = await prisma.article.findMany({
    where: {
      publishedAt: { gte: since },
    },
    select: {
      id: true,
      title: true,
      url: true,
      description: true,
      keywords: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  })

  const matches: ArticleMatch[] = []

  for (const user of users) {
    for (const keyword of user.keywords) {
      const kwLower = keyword.toLowerCase()
      for (const article of articles) {
        const titleMatch = article.title.toLowerCase().includes(kwLower)
        const descMatch = article.description
          ? article.description.toLowerCase().includes(kwLower)
          : false
        const keywordMatch = article.keywords
          .toLowerCase()
          .split(',')
          .some((kw) => kw.trim() === kwLower)

        if (titleMatch || descMatch || keywordMatch) {
          const existing = matches.find(
            (m) => m.articleId === article.id && m.userId === user.userId,
          )
          if (existing) {
            if (!existing.matchedKeywords.includes(keyword)) {
              existing.matchedKeywords.push(keyword)
            }
          } else {
            matches.push({
              articleId: article.id,
              articleTitle: article.title,
              articleUrl: article.url,
              publishedAt: article.publishedAt,
              matchedKeywords: [keyword],
              userId: user.userId,
               userEmail: user.email ?? '',
            })
          }
        }
      }
    }
  }

  return {
    totalUsers: await prisma.user.count(),
    usersWithAlerts: users.length,
    totalArticles: articles.length,
    matches,
  }
}

/**
 * Dispatch keyword alert matches — logs each match and sends a push notification.
 */
export async function dispatchAlerts(
  hoursBack: number = 24,
): Promise<{ dispatched: number; pushOk: number; pushFail: number }> {
  const result = await checkAlerts(hoursBack)
  let pushOk = 0
  let pushFail = 0

  if (result.matches.length > 0) {
    log.info(
      `Keyword alerts: ${result.matches.length} matches across ${result.usersWithAlerts} users for ${result.totalArticles} articles`,
    )

    const pushResults = await Promise.allSettled(
      result.matches.map((match) =>
        sendKeywordAlert(match.userId, match.articleTitle, match.matchedKeywords, match.articleUrl),
      ),
    )

    for (let i = 0; i < pushResults.length; i++) {
      const r = pushResults[i]
      const match = result.matches[i]
      if (r.status === 'fulfilled' && r.value.success) {
        pushOk++
      } else {
        pushFail++
        const err = r.status === 'rejected' ? r.reason : r.value.error
        log.warn(
          `Push failed for user=${match?.userEmail} article="${match?.articleTitle}": ${err}`,
        )
      }
    }

    log.info(`Keyword alert push: ${pushOk} delivered, ${pushFail} failed`)
  }

  return { dispatched: result.matches.length, pushOk, pushFail }
}
