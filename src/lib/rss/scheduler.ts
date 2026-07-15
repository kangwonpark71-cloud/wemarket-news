import cron from 'node-cron'
import { fetchFeed } from './fetcher'
import { upsertArticles } from './db-service'
import { getSourceIdByNameEn, logFetch, seedSources } from './service'
import { ALL_SOURCES } from './sources'

let initialized = false

export async function runRssFetch(sourceNameEn?: string) {
  const sourcesToFetch = sourceNameEn
    ? ALL_SOURCES.filter(s => s.nameEn === sourceNameEn)
    : ALL_SOURCES

  const anySource = sourcesToFetch.length > 0
    ? await getSourceIdByNameEn(sourcesToFetch[0].nameEn) : null
  if (!anySource) {
    console.log('[Scheduler] No sources in DB, seeding...')
    await seedSources()
  }

  console.log(`[Scheduler] Fetching ${sourcesToFetch.length} sources`)
  for (const config of sourcesToFetch) {
    const start = Date.now()
    try {
      const sourceId = await getSourceIdByNameEn(config.nameEn)
      if (!sourceId) { console.warn(`[Scheduler] Source ${config.nameEn} not found`); continue }
      const { articles, error } = await fetchFeed(config)
      if (error) { await logFetch(sourceId, 'error', 0, 0, Date.now() - start, error); continue }
      const { newCount, totalCount } = await upsertArticles(sourceId, articles)
      await logFetch(sourceId, newCount > 0 ? 'success' : 'partial', totalCount, newCount, Date.now() - start)
      console.log(`[Scheduler] ${config.nameEn}: ${newCount} new / ${totalCount} total`)
    } catch (err) {
      console.error(`[Scheduler] ${config.nameEn} failed:`, err)
    }
  }
}

export function startRssScheduler() {
  if (initialized) return
  initialized = true

  // Run every 3 hours at minute 0
  cron.schedule('0 */3 * * *', () => {
    console.log('[Scheduler] Cron trigger (3-hour interval)')
    runRssFetch().catch(err => console.error('[Scheduler] Cron error:', err))
  })

  // Also run once on startup (with 10s delay to let DB connections settle)
  setTimeout(() => {
    console.log('[Scheduler] Initial fetch on startup')
    runRssFetch().catch(err => console.error('[Scheduler] Initial fetch error:', err))
  }, 10000)

  console.log('[Scheduler] RSS scheduler started (every 3 hours)')
}
