import cron from 'node-cron'
import { fetchFeed } from './fetcher'
import { upsertArticles } from './db-service'
import { getSourceIdByNameEn, logFetch, seedSources } from './service'
import { ALL_SOURCES } from './sources'
import { fetchProgressPubSub } from '@/lib/sse/pubsub'
import { cacheService } from '@/lib/services/cache/cache-service'

export interface FetchResult {
  source: string
  status: 'success' | 'partial' | 'error' | 'skipped'
  total?: number
  new?: number
  error?: string
  duration: number
}

let initialized = false

export async function runRssFetch(sourceNameEn?: string): Promise<FetchResult[]> {
  const sourcesToFetch = sourceNameEn
    ? ALL_SOURCES.filter(s => s.nameEn === sourceNameEn)
    : ALL_SOURCES

  const anySource = sourcesToFetch.length > 0
    ? await getSourceIdByNameEn(sourcesToFetch[0].nameEn) : null
  if (!anySource) {
    console.log('[Scheduler] No sources in DB, seeding...')
    await seedSources()
  }

  const results: FetchResult[] = []
  const totalSources = sourcesToFetch.length

  console.log(`[Scheduler] Fetching ${totalSources} sources`)
  fetchProgressPubSub.publish('fetch-progress', {
    phase: 'start',
    system: 'rss',
    total: totalSources,
    completed: 0,
  })

  for (let i = 0; i < sourcesToFetch.length; i++) {
    const config = sourcesToFetch[i]
    const start = Date.now()
    try {
      const sourceId = await getSourceIdByNameEn(config.nameEn)
      if (!sourceId) {
        results.push({ source: config.nameEn, status: 'skipped', error: 'Source not found in DB', duration: Date.now() - start })
        fetchProgressPubSub.publish('fetch-progress', {
          phase: 'progress', system: 'rss', source: config.nameEn, status: 'skipped',
          total: totalSources, completed: results.length, current: i + 1,
        })
        continue
      }
      const { articles, error } = await fetchFeed(config)
      if (error) {
        await logFetch(sourceId, 'error', 0, 0, Date.now() - start, error)
        results.push({ source: config.nameEn, status: 'error', error, duration: Date.now() - start })
        fetchProgressPubSub.publish('fetch-progress', {
          phase: 'progress', system: 'rss', source: config.nameEn, status: 'error', error,
          total: totalSources, completed: results.length, current: i + 1,
        })
        continue
      }
      const { newCount, totalCount } = await upsertArticles(sourceId, articles)
      const status = newCount > 0 ? 'success' : 'partial'
      await logFetch(sourceId, status, totalCount, newCount, Date.now() - start)
      results.push({ source: config.nameEn, status, total: totalCount, new: newCount, duration: Date.now() - start })
      fetchProgressPubSub.publish('fetch-progress', {
        phase: 'progress', system: 'rss', source: config.nameEn, status,
        newArticles: newCount, totalArticles: totalCount,
        total: totalSources, completed: results.length, current: i + 1,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      results.push({ source: config.nameEn, status: 'error', error: errorMessage, duration: Date.now() - start })
      fetchProgressPubSub.publish('fetch-progress', {
        phase: 'progress', system: 'rss', source: config.nameEn, status: 'error', error: errorMessage,
        total: totalSources, completed: results.length, current: i + 1,
      })
    }
  }

  const ok = results.filter(r => r.status === 'success' || r.status === 'partial').length
  const err = results.filter(r => r.status === 'error').length
  fetchProgressPubSub.publish('fetch-complete', {
    system: 'rss',
    total: results.length,
    success: ok,
    errors: err,
    results,
  })

  return results
}

async function runRssFetchWithLock(): Promise<FetchResult[]> {
  const lockName = 'scheduler:job:rss';
  const acquired = await cacheService.acquireLock(lockName, 600);
  if (!acquired) {
    console.log('[Scheduler] RSS job skipped: lock already held by another instance');
    return [];
  }
  try {
    return await runRssFetch();
  } finally {
    setTimeout(() => {
      cacheService.releaseLock(lockName).catch(() => {});
    }, 10000);
  }
}

export function startRssScheduler() {
  if (initialized) return
  initialized = true

  cron.schedule('0 */3 * * *', () => {
    console.log('[Scheduler] Cron trigger (3-hour interval)')
    runRssFetchWithLock().catch(err => console.error('[Scheduler] Cron error:', err))
  })

  setTimeout(() => {
    console.log('[Scheduler] Initial fetch on startup')
    runRssFetchWithLock().then(results => {
      if (results.length === 0) return;
      const ok = results.filter(r => r.status === 'success' || r.status === 'partial').length
      const err = results.filter(r => r.status === 'error').length
      console.log(`[Scheduler] Initial fetch complete: ${ok} ok, ${err} errors`)
    }).catch(err => console.error('[Scheduler] Initial fetch error:', err))
  }, 2000)

  console.log('[Scheduler] RSS scheduler started (every 3 hours with distributed locking)')
}
