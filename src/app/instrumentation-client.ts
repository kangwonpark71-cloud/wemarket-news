import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Optionally enable Sentry in development for testing
  enabled: process.env.NODE_ENV === "production",

  // Add optional integrations for browser
  integrations: [],

  // Set tracesSampleRate to 1.0 to capture 100% of transactions
  // for performance monitoring.
  tracesSampleRate: 0.1,

  // Set `environment` value if available
  environment: process.env.NODE_ENV || "development",
});

// Track route transitions for performance monitoring
export function onRouterTransitionStart() {
  // Router transition tracking is handled automatically by Sentry
  // This export is for future use if custom tracking is needed
}
