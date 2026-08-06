import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { captureError } from '@/lib/services/monitoring/error-log-service';

// Client-side error reporting endpoint (from global-error boundary etc.)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { level, source, message, stack, context } = body || {};

    if (!message) {
      return apiError('message is required', 400);
    }

    const id = await captureError({
      level: level === 'warn' || level === 'info' ? level : 'error',
      source: typeof source === 'string' && source ? source.slice(0, 200) : 'client',
      message: String(message).slice(0, 4000),
      stack: stack ? String(stack).slice(0, 8000) : null,
      context: context && typeof context === 'object' ? context : null,
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return apiError('failed', 500);
  }
}
