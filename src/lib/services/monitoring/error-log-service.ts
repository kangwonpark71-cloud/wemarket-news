/**
 * Error Log Service
 * Lightweight error monitoring: capture, query, cleanup.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ErrorLogService');

export type ErrorLevel = 'error' | 'warn' | 'info';

export interface CaptureErrorInput {
  level?: ErrorLevel;
  source: string;
  message: string;
  stack?: string | null;
  context?: Record<string, unknown> | null;
}

export interface ErrorLogQuery {
  page?: number;
  pageSize?: number;
  level?: ErrorLevel;
  source?: string;
}

const MAX_CONTEXT_BYTES = 4 * 1024;

/** Safe context serialization — never throw, never store huge objects. */
function safeContext(context: unknown): string | null {
  if (context === null || context === undefined) return null;
  try {
    const str = JSON.stringify(context);
    if (!str || str.length > MAX_CONTEXT_BYTES) return null;
    return str;
  } catch {
    return null;
  }
}

/** Capture an error to the DB and optionally to Sentry. Returns the DB log id. */
export async function captureError(input: CaptureErrorInput): Promise<string | null> {
  try {
    const { level = 'error', source, message, stack, context } = input
    const jsonContext = safeContext(context)

    // Bridge to Sentry first so we get an event ID.
    let sentryEventId: string | null = null
    if (process.env.SENTRY_DSN && typeof (globalThis as Record<string, unknown>).Sentry !== 'undefined') {
      try {
        const Sentry = await import('@sentry/nextjs')
        if (Sentry.isInitialized()) {
          const eventId = Sentry.captureException(new Error(String(message).slice(0, 4000)), {
            level: level === 'warn' ? 'warning' : level === 'info' ? 'info' : 'error',
            tags: { source: String(source || 'client').slice(0, 200) },
            extra: {
              ...(stack ? { stack: String(stack).slice(0, 8000) } : {}),
              ...(context && typeof context === 'object' ? { context } : {}),
            },
          })
          if (typeof eventId === 'string') {
            sentryEventId = eventId
          }
        }
      } catch {
        // Sentry bridge failure is non-critical
      }
    }

    const created = await prisma.errorLog.create({
      data: {
        level,
        source,
        message: message.slice(0, 4000),
        stack: stack ? stack.slice(0, 8000) : null,
        sentryEventId,
        ...(jsonContext ? { context: JSON.parse(jsonContext) as Prisma.InputJsonValue } : {}),
      },
      select: { id: true },
    })
    return created.id
  } catch (err) {
    log.error('captureError failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Query error logs with level/source filter and pagination. */
export async function getErrorLogs(query: ErrorLogQuery = {}) {
  const { page = 1, pageSize = 50, level, source } = query;
  const where = {
    ...(level ? { level } : {}),
    ...(source ? { source: { contains: source } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.errorLog.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Delete logs older than retentionDays. Returns count deleted. */
export async function deleteOldErrorLogs(retentionDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}

/** Clear all error logs (or filtered). Returns count deleted. */
export async function clearErrorLogs(level?: ErrorLevel, source?: string): Promise<number> {
  const where = {
    ...(level ? { level } : {}),
    ...(source ? { source: { contains: source } } : {}),
  };
  const result = await prisma.errorLog.deleteMany({ where });
  return result.count;
}

/** Aggregate counts grouped by level and top sources — for dashboard widgets. */
export async function getErrorSummary() {
  const [byLevel, bySource, total, last24h] = await Promise.all([
    prisma.errorLog.groupBy({ by: ['level'], _count: { _all: true } }),
    prisma.errorLog.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
      take: 10,
    }),
    prisma.errorLog.count(),
    prisma.errorLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return {
    total,
    last24h,
    byLevel: Object.fromEntries(byLevel.map((r) => [r.level, r._count._all])),
    bySource: bySource.map((r) => ({ source: r.source, count: r._count._all })),
  };
}
