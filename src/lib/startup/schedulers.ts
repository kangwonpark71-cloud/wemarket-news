import { startRssScheduler } from '@/lib/rss/scheduler'
import { fetchAllAIITNews, run15MinJob, run30MinJob, run60MinJob, seedAIITSourcesIfEmpty } from '@/lib/ai-it/scheduler-service'
import { schedulerService } from '@/lib/services/scheduler/scheduler-service'
import cron from 'node-cron'

let started = false

export async function startAllSchedulers() {
  if (started) return
  started = true

  console.log('[Startup] Initializing all schedulers...')

  // 1. RSS Scheduler (3시간 간격 + 서버 시작 시)
  startRssScheduler()

  // 2. AI/IT Scheduler (15분/30분/60분 간격)
  cron.schedule('*/15 * * * *', () => {
    console.log('[Scheduler] AI/IT 15-min job (priority sources)')
    run15MinJob().catch(err => console.error('[Scheduler] 15-min job error:', err))
  })

  cron.schedule('*/30 * * * *', () => {
    console.log('[Scheduler] AI/IT 30-min job (mid-priority sources)')
    run30MinJob().catch(err => console.error('[Scheduler] 30-min job error:', err))
  })

  cron.schedule('*/60 * * * *', () => {
    console.log('[Scheduler] AI/IT 60-min job (all remaining sources)')
    run60MinJob().catch(err => console.error('[Scheduler] 60-min job error:', err))
  })

  // AI/IT 초기 fetch (서버 시작 5초 후)
  setTimeout(async () => {
    console.log('[Scheduler] AI/IT initial fetch on startup')
    const result = await fetchAllAIITNews()
    console.log(`[Scheduler] AI/IT initial fetch: ${result.totalNew} new / ${result.totalCount} total (${result.errors} errors)`)
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
