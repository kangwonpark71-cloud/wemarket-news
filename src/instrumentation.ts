export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAllSchedulers } = await import('@/lib/startup/schedulers')
    await startAllSchedulers()
    console.log('[Instrumentation] All schedulers started')
  }
}
