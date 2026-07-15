import { startRssScheduler } from '@/lib/rss/scheduler'
import { seedAIITSources } from '@/lib/ai-it/db-service'
import { fetchAllAIITNews } from '@/lib/ai-it/scheduler-service'
import cron from 'node-cron'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startRssScheduler()

    try {
      const { getActiveAIITSources } = await import('@/lib/ai-it/db-service')
      const existing = await getActiveAIITSources()
      if (existing.length === 0) {
        console.log('[Instrumentation] No AI/IT sources found, seeding...')
        await seedAIITSources()
      }
    } catch (err) {
      console.warn('[Instrumentation] AI/IT source check failed:', err)
    }

    cron.schedule('*/15 * * * *', () => {
      const { run15MinJob } = require('@/lib/ai-it/scheduler-service')
      run15MinJob().catch((e: Error) => console.error('[AIIT/15m]', e))
    })

    cron.schedule('*/30 * * * *', () => {
      const { run30MinJob } = require('@/lib/ai-it/scheduler-service')
      run30MinJob().catch((e: Error) => console.error('[AIIT/30m]', e))
    })

    cron.schedule('0 * * * *', () => {
      const { run60MinJob } = require('@/lib/ai-it/scheduler-service')
      run60MinJob().catch((e: Error) => console.error('[AIIT/60m]', e))
    })

    setTimeout(() => {
      fetchAllAIITNews().catch((e: Error) => console.error('[AIIT/initial]', e))
    }, 15000)

    console.log('[Instrumentation] AI/IT scheduler started')
  }
}
