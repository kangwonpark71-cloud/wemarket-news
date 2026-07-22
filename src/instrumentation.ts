export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate critical environment variables at startup
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('[FATAL] JWT_SECRET environment variable is not set. Authentication will fail.')
      console.error('[FATAL] Set JWT_SECRET in your Railway environment variables.')
    } else if (jwtSecret.length < 32) {
      console.warn('[WARN] JWT_SECRET is shorter than 32 characters. Consider using a longer secret for security.')
    }

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error('[FATAL] DATABASE_URL environment variable is not set.')
    }

    const { startAllSchedulers } = await import('@/lib/startup/schedulers')
    await startAllSchedulers()
  }
}
