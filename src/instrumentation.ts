export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate critical environment variables at startup
    const { createLogger } = await import('@/lib/logger');
    const log = createLogger('Instrumentation');
    
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      log.error('[FATAL] JWT_SECRET environment variable is not set. Authentication will fail.')
      log.error('[FATAL] Set JWT_SECRET in your Railway environment variables.')
    } else if (jwtSecret.length < 32) {
      log.warn('[WARN] JWT_SECRET is shorter than 32 characters. Consider using a longer secret for security.')
    }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      log.error('[FATAL] DATABASE_URL environment variable is not set.')
    }

    const { startAllSchedulers } = await import('@/lib/startup/schedulers')
    await startAllSchedulers()
  }
}
