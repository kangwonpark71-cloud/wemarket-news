/**
 * Keyword Alert Service
 * Matches new articles against user-configured alert keywords.
 * Logs matches for admin review and can trigger push notifications.
 */

import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger'

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
 * Log a keyword alert match to the application log.
 * Future: can extend to push notification dispatch.
 */
export async function dispatchAlerts(
  hoursBack: number = 24,
): Promise<{ dispatched: number }> {
  const result = await checkAlerts(hoursBack)

  if (result.matches.length > 0) {
    log.info(
      `Keyword alerts: ${result.matches.length} matches across ${result.usersWithAlerts} users for ${result.totalArticles} articles`,
    )
    for (const match of result.matches) {
      log.info(
        `Alert [${match.matchedKeywords.join(', ')}] -> user=${match.userEmail} article="${match.articleTitle}"`,
      )
    }
  }

  return { dispatched: result.matches.length }
}
