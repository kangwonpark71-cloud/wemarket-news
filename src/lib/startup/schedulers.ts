import { startRssScheduler } from '@/lib/rss/scheduler'
import { fetchAllAIITNews, run15MinJob, run30MinJob, run60MinJob, seedAIITSourcesIfEmpty } from '@/lib/ai-it/scheduler-service'
import { schedulerService } from '@/lib/services/scheduler/scheduler-service'
import { runJobWithLock } from '@/lib/utils/lock'
import cron from 'node-cron'
import { createDefaultSchedulers } from '@/lib/scheduler/scheduler-manager'

let started = false

export async function startAllSchedulers() {
  if (started) return
  started = true

  if (process.env.DISABLE_SCHEDULERS === '1' || process.env.PIPELINE_TEST === '1') {
    return
  }

  const schedulerManager = createDefaultSchedulers()
  await schedulerManager.startAll()

  // Legacy: Keep existing scheduler code for backward compatibility
  // TODO: Migrate all schedulers to the new manager system

  // 1. RSS Scheduler (3시간 간격 + 서버 시작 시)
  startRssScheduler()

  // 2. AI/IT Scheduler (15분/30분/60분 간격)
  cron.schedule('*/15 * * * *', () => {
    runJobWithLock('ai-it:15min', () => run15MinJob()).catch(err => console.error('[Scheduler] 15-min job error:', err))
  })

  cron.schedule('*/30 * * * *', () => {
    runJobWithLock('ai-it:30min', () => run30MinJob()).catch(err => console.error('[Scheduler] 30-min job error:', err))
  })

  cron.schedule('*/60 * * * *', () => {
    runJobWithLock('ai-it:60min', () => run60MinJob()).catch(err => console.error('[Scheduler] 60-min job error:', err))
  })

  // AI/IT 초기 fetch (서버 시작 5초 후)
  setTimeout(async () => {
    await runJobWithLock('ai-it:initial', async () => {
      await fetchAllAIITNews()
    })
  }, 5000)

  // 3. Financial Data Scheduler
  schedulerService.start()

  // AI/IT source seeding
  setTimeout(async () => {
    await seedAIITSourcesIfEmpty()
  }, 3000)

}
