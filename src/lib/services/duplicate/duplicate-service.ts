/**
 * Duplicate Article Merge Engine
 * Finds and merges duplicate articles based on normalized title similarity.
 * Keeps the earliest-published article, re-links summaries/tags, removes duplicates.
 */

import prisma from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('DuplicateService')

/**
 * Normalize a title for comparison — lowercase, collapse whitespace, strip trailing punctuation.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface DuplicateGroup {
  keptId: string
  keptTitle: string
  removedIds: string[]
  removedTitles: string[]
}

export interface MergeResult {
  totalGroups: number
  totalDuplicates: number
  groups: DuplicateGroup[]
  errors: string[]
}

/**
 * Find and merge duplicate articles across all sources.
 * Strategy: group by normalized title, keep earliest publishedAt, re-link related records.
 */
export async function mergeDuplicates(dryRun = false): Promise<MergeResult> {
  const result: MergeResult = { totalGroups: 0, totalDuplicates: 0, groups: [], errors: [] }

  try {
    // 1. Fetch all articles with their normalized titles
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        publishedAt: true,
        url: true,
      },
      orderBy: { publishedAt: 'asc' },
    })

    // 2. Group by normalized title
    const groups = new Map<string, typeof articles>()
    for (const article of articles) {
      const key = normalizeTitle(article.title)
      if (!key) continue
      const group = groups.get(key) ?? []
      group.push(article)
      groups.set(key, group)
    }

    // 3. Process each group with >1 article
    for (const [, group] of groups) {
      if (group.length <= 1) continue

      // Keep the earliest published article
      const [kept, ...duplicates] = group
      result.totalGroups++
      result.totalDuplicates += duplicates.length
      result.groups.push({
        keptId: kept.id,
        keptTitle: kept.title,
        removedIds: duplicates.map(d => d.id),
        removedTitles: duplicates.map(d => d.title),
      })

      if (dryRun) continue

      // Re-link NewsSummary (if any duplicate has a summary, try to attach to kept)
      for (const dup of duplicates) {
        try {
          const summary = await prisma.newsSummary.findUnique({ where: { articleId: dup.id } })
          if (summary) {
            const existingSummary = await prisma.newsSummary.findUnique({ where: { articleId: kept.id } })
            if (!existingSummary) {
              // Move summary to kept article
              await prisma.newsSummary.update({
                where: { id: summary.id },
                data: { articleId: kept.id },
              })
            } else {
              // Both have summaries — delete the duplicate's summary
              await prisma.newsSummary.delete({ where: { id: summary.id } })
            }
          }
        } catch (e) {
          result.errors.push(`Summary relink failed for ${dup.id}: ${(e as Error).message}`)
        }
      }

      // Re-link NewsTagRelation
      for (const dup of duplicates) {
        try {
          const tags = await prisma.newsTagRelation.findMany({ where: { articleId: dup.id } })
          for (const tag of tags) {
            const existing = await prisma.newsTagRelation.findFirst({
              where: { articleId: kept.id, tagId: tag.tagId },
            })
            if (!existing) {
              await prisma.newsTagRelation.update({
                where: { id: tag.id },
                data: { articleId: kept.id },
              })
            } else {
              await prisma.newsTagRelation.delete({ where: { id: tag.id } })
            }
          }
        } catch (e) {
          result.errors.push(`Tag relink failed for ${dup.id}: ${(e as Error).message}`)
        }
      }

      // Delete duplicate articles
      await prisma.article.deleteMany({
        where: { id: { in: duplicates.map(d => d.id) } },
      })
    }

    log.info(`Merge complete: ${result.totalGroups} groups, ${result.totalDuplicates} duplicates merged`)
  } catch (error) {
    log.error('Duplicate merge failed:', error)
    result.errors.push(`Fatal: ${(error as Error).message}`)
  }

  return result
}

/**
 * Get duplicate statistics without merging — counts of potential duplicates.
 */
export async function getDuplicateStats(): Promise<{ potentialDuplicates: number; groupsCount: number }> {
  const articles = await prisma.article.findMany({
    select: { id: true, title: true },
  })

  const normalized = articles.map(a => ({ id: a.id, key: normalizeTitle(a.title) }))
  const counts = new Map<string, number>()
  for (const { key } of normalized) {
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  let potentialDuplicates = 0
  let groupsCount = 0
  for (const count of counts.values()) {
    if (count > 1) {
      potentialDuplicates += count - 1
      groupsCount++
    }
  }

  return { potentialDuplicates, groupsCount }
}
