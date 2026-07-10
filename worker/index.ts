import { fetchFeed } from '../src/lib/rss/fetcher'
import { upsertArticles } from '../src/lib/rss/db-service'
import { getSourceIdByNameEn, logFetch } from '../src/lib/rss/service'
import { ALL_SOURCES } from '../src/lib/rss/sources'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fetchAllFeeds() {
  console.log(`[${new Date().toISOString()}] Starting RSS fetch...`)

  for (const sourceConfig of ALL_SOURCES) {
    const startTime = Date.now()

    try {
      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (!sourceId) {
        console.error(`Source ${sourceConfig.nameEn} not found in database`)
        continue
      }

      console.log(`Fetching ${sourceConfig.name}...`)
      const { articles, error } = await fetchFeed(sourceConfig)
      const duration = Date.now() - startTime

      if (error) {
        await logFetch(sourceId, 'error', 0, 0, duration, error)
        console.error(`✗ ${sourceConfig.name}: ${error}`)
        continue
      }

      const { newCount, totalCount } = await upsertArticles(sourceId, articles)
      const status = newCount > 0 ? 'success' : 'partial'
      await logFetch(sourceId, status, totalCount, newCount, duration)

      console.log(`✓ ${sourceConfig.name}: ${newCount} new / ${totalCount} total (${duration}ms)`)
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      const sourceId = await getSourceIdByNameEn(sourceConfig.nameEn)
      if (sourceId) {
        await logFetch(sourceId, 'error', 0, 0, duration, errorMessage)
      }

      console.error(`✗ ${sourceConfig.name}: ${errorMessage}`)
    }
  }

  console.log(`[${new Date().toISOString()}] RSS fetch completed`)
}

async function main() {
  try {
    await fetchAllFeeds()
  } finally {
    await prisma.$disconnect()
  }
}

main()
