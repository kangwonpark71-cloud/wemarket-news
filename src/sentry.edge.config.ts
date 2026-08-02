import * as Sentry from '@sentry/nextjs';

// Sentry edge-runtime SDK init (middleware, edge API routes).
// Only activates when SENTRY_DSN is set. Otherwise no-op.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

/** True when Sentry is configured AND initialized in edge runtime. */
export function isSentryEnabled(): boolean {
  return Boolean(dsn) && Sentry.isInitialized();
}
