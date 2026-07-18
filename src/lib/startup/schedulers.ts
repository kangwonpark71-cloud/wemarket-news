import { startRssScheduler } from '@/lib/rss/scheduler'
import { fetchAllAIITNews, run15MinJob, run30MinJob, run60MinJob, seedAIITSourcesIfEmpty } from '@/lib/ai-it/scheduler-service'
import { schedulerService } from '@/lib/services/scheduler/scheduler-service'
import { cacheService } from '@/lib/services/cache/cache-service'
import cron from 'node-cron'

let started = false

async function runJobWithLock(name: string, jobFn: () => Promise<unknown>, ttlSeconds: number = 300) {
  const lockName = `scheduler:job:${name}`;
  const acquired = await cacheService.acquireLock(lockName, ttlSeconds);
  if (!acquired) {
    console.log(`[Scheduler] Job ${name} skipped: lock already held by another instance`);
    return;
  }
  try {
    await jobFn();
  } finally {
    setTimeout(() => {
      cacheService.releaseLock(lockName).catch(() => {});
    }, 10000);
  }
}

export async function startAllSchedulers() {
  if (started) return
  started = true

  if (process.env.DISABLE_SCHEDULERS === '1' || process.env.PIPELINE_TEST === '1') {
    console.log('[Startup] Schedulers disabled for development/test mode')
    return
  }

  console.log('[Startup] Initializing all schedulers with distributed locking...')

  // 1. RSS Scheduler (3시간 간격 + 서버 시작 시)
  startRssScheduler()

  // 2. AI/IT Scheduler (15분/30분/60분 간격)
  cron.schedule('*/15 * * * *', () => {
    console.log('[Scheduler] AI/IT 15-min job (priority sources)')
    runJobWithLock('ai-it:15min', () => run15MinJob()).catch(err => console.error('[Scheduler] 15-min job error:', err))
  })

  cron.schedule('*/30 * * * *', () => {
    console.log('[Scheduler] AI/IT 30-min job (mid-priority sources)')
    runJobWithLock('ai-it:30min', () => run30MinJob()).catch(err => console.error('[Scheduler] 30-min job error:', err))
  })

  cron.schedule('*/60 * * * *', () => {
    console.log('[Scheduler] AI/IT 60-min job (all remaining sources)')
    runJobWithLock('ai-it:60min', () => run60MinJob()).catch(err => console.error('[Scheduler] 60-min job error:', err))
  })

  // AI/IT 초기 fetch (서버 시작 5초 후)
  setTimeout(async () => {
    console.log('[Scheduler] AI/IT initial fetch on startup')
    await runJobWithLock('ai-it:initial', async () => {
      const result = await fetchAllAIITNews()
      console.log(`[Scheduler] AI/IT initial fetch: ${result.totalNew} new / ${result.totalCount} total (${result.errors} errors)`)
    })
  }, 5000)

  // 3. Financial Data Scheduler
  schedulerService.start()

  // AI/IT source seeding
  setTimeout(async () => {
    if (process.env.NODE_ENV !== 'production') {
      await seedAIITSourcesIfEmpty()
    }
  }, 3000)

  console.log('[Startup] All schedulers initialized')
}
