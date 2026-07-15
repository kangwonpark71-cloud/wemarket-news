import { startRssScheduler } from '@/lib/rss/scheduler'
import cron from 'node-cron'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startRssScheduler()
    console.log('[Instrumentation] RSS scheduler started')
  }
}