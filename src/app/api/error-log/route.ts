import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { captureError } from '@/lib/services/monitoring/error-log-service';

// Client-side error reporting endpoint (from global-error boundary etc.)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { level, source, message, stack, context } = body || {};

    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
    }

    const id = await captureError({
      level: level === 'warn' || level === 'info' ? level : 'error',
      source: typeof source === 'string' && source ? source.slice(0, 200) : 'client',
      message: String(message).slice(0, 4000),
      stack: stack ? String(stack).slice(0, 8000) : null,
      context: context && typeof context === 'object' ? context : null,
    });

    // Bridge to Sentry (no-op unless SENTRY_DSN is configured)
    if (process.env.SENTRY_DSN && Sentry.isInitialized()) {
      Sentry.captureException(new Error(String(message).slice(0, 4000)), {
        level: level === 'warn' ? 'warning' : level === 'info' ? 'info' : 'error',
        tags: { source: String(source || 'client').slice(0, 200) },
        extra: {
          ...(stack ? { stack: String(stack).slice(0, 8000) } : {}),
          ...(context && typeof context === 'object' ? { context } : {}),
        },
      });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json({ success: false, error: 'failed' }, { status: 500 });
  }
}
