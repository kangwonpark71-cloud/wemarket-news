import { startRssScheduler } from '@/lib/rss/scheduler'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    startRssScheduler()
  }
}
