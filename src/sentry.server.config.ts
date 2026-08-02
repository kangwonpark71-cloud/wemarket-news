import * as Sentry from '@sentry/nextjs';

// Sentry server-side SDK init.
// Only activates when SENTRY_DSN is set (Railway env). Otherwise no-op.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    // 100% traces in dev, 10% in production (free tier friendly)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

/** True when Sentry is configured AND initialized on the server. */
export function isSentryEnabled(): boolean {
  return Boolean(dsn) && Sentry.isInitialized();
}
