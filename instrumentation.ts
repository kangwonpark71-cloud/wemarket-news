import { startAllSchedulers } from '@/lib/startup/schedulers'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await startAllSchedulers()
    console.log('[Instrumentation] All schedulers started')
  }
}
