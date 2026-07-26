import cron from 'node-cron'
import { fetchFeed } from './fetcher'
import { upsertArticles } from './db-service'
import { getSourceIdByNameEn, logFetch, seedSources } from './service'
import { ALL_SOURCES } from './sources'
import { fetchProgressPubSub } from '@/lib/sse/pubsub'
import { runJobWithLock } from '@/lib/utils/lock'
import { logSchedulerError, logSchedulerSuccess, createSafeSchedulerJob } from '@/lib/utils/scheduler-error-handler'

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

  // Always seed sources to ensure new or updated sources are in the DB
  await seedSources()

  const results: FetchResult[] = []
  const totalSources = sourcesToFetch.length
  const startTime = Date.now()

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
      logSchedulerError('rss', config.nameEn, err instanceof Error ? err : new Error(errorMessage), {
        sourceIndex: i,
        totalSources,
      })
      results.push({ source: config.nameEn, status: 'error', error: errorMessage, duration: Date.now() - start })
      fetchProgressPubSub.publish('fetch-progress', {
        phase: 'progress', system: 'rss', source: config.nameEn, status: 'error', error: errorMessage,
        total: totalSources, completed: results.length, current: i + 1,
      })
    }
  }

  const totalDuration = Date.now() - startTime
  const ok = results.filter(r => r.status === 'success' || r.status === 'partial').length
  const err = results.filter(r => r.status === 'error').length
  
  logSchedulerSuccess('rss', 'runRssFetch', totalDuration, {
    totalSources: totalSources,
    successful: ok,
    errors: err,
  })

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
  let results: FetchResult[] = [];
  const acquired = await runJobWithLock('rss', async () => {
    results = await runRssFetch();
  }, 600);
  return acquired ? results : [];
}

export function startRssScheduler() {
  if (initialized) return
  initialized = true

  const safeRssFetch = createSafeSchedulerJob('rss', 'cron-fetch', runRssFetchWithLock, {
    retryCount: 2,
    retryDelay: 5000,
    onError: (error) => {
      console.error('[Scheduler] Cron error:', error.message)
    },
  })

  cron.schedule('0 */3 * * *', () => {
    safeRssFetch().catch(err => console.error('[Scheduler] Cron error:', err))
  })

  setTimeout(() => {
    safeRssFetch().then(results => {
      if (!results || results.length === 0) return;
    }).catch(err => console.error('[Scheduler] Initial fetch error:', err))
  }, 2000)

}
