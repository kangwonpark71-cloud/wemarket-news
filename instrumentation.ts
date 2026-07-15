import { startRssScheduler } from '@/lib/rss/scheduler'
import { seedAIITSources, getActiveAIITSources } from '@/lib/ai-it/db-service'
import { fetchAllAIITNews, run15MinJob, run30MinJob, run60MinJob } from '@/lib/ai-it/scheduler-service'
import cron from 'node-cron'

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

    cron.schedule('*/15 * * * *', () => {
      run15MinJob().catch((e: Error) => console.error('[AIIT/15m]', e))
    })

    cron.schedule('*/30 * * * *', () => {
      run30MinJob().catch((e: Error) => console.error('[AIIT/30m]', e))
    })

    cron.schedule('0 * * * *', () => {
      run60MinJob().catch((e: Error) => console.error('[AIIT/60m]', e))
    })

    setTimeout(() => {
      fetchAllAIITNews().catch((e: Error) => console.error('[AIIT/initial]', e))
    }, 15000)

    console.log('[Instrumentation] AI/IT scheduler started')
  }
}
