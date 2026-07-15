import { startRssScheduler } from '@/lib/rss/scheduler'
import { seedAIITSources, getActiveAIITSources } from '@/lib/ai-it/db-service'
import cron from 'node-cron'

let aiitSchedulerModule: typeof import('@/lib/ai-it/scheduler-service') | null = null

async function getAIITScheduler() {
  if (!aiitSchedulerModule) {
    aiitSchedulerModule = await import('@/lib/ai-it/scheduler-service')
  }
  return aiitSchedulerModule
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startRssScheduler()

    try {
      const existing = await getActiveAIITSources()
      if (existing.length === 0) {
        console.log('[Instrumentation] No AI/IT sources found, seeding...')
        await seedAIITSources()
      } else {
        console.log(`[Instrumentation] AI/IT sources already seeded: ${existing.length}`)
      }
    } catch (err) {
      console.warn('[Instrumentation] AI/IT source check failed:', err)
    }

    const scheduleJob = (schedule: string, jobName: string, fn: () => Promise<void>) => {
      cron.schedule(schedule, () => {
        fn().catch((e: Error) => console.error(`[AIIT/${jobName}]`, e))
      })
    }

    await getAIITScheduler().then((mod) => {
      scheduleJob('*/15 * * * *', '15m', () => mod.run15MinJob())
      scheduleJob('*/30 * * * *', '30m', () => mod.run30MinJob())
      scheduleJob('0 * * * *', '60m', () => mod.run60MinJob())

      setTimeout(() => {
        mod.fetchAllAIITNews().catch((e: Error) => console.error('[AIIT/initial]', e))
      }, 15000)
    })

    console.log('[Instrumentation] AI/IT scheduler started')
  }
}