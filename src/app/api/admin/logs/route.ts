import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminLogs')

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
  const type = searchParams.get('type') || 'all';
  const status = searchParams.get('status') || '';
  const service = searchParams.get('service') || '';
  const sourceId = searchParams.get('sourceId') || '';

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sourceId) where.sourceId = sourceId;

    interface LogEntry {
      id: string;
      type: string;
      service: string;
      sourceName: string;
      status: string;
      count: number | null;
      newCount: number | null;
      error: string | null;
      duration: number | null;
      timestamp: Date;
    }

    let logs: LogEntry[] = [];
    let total = 0;

    if (type === 'all' || type === 'fetch') {
      const fetchWhere: Record<string, unknown> = { ...where };
      const [fetchLogs, fetchTotal] = await Promise.all([
        prisma.fetchLog.findMany({
          where: fetchWhere,
          orderBy: { fetchedAt: 'desc' },
          skip: type === 'all' ? 0 : (page - 1) * limit,
          take: type === 'all' ? 15 : limit,
          include: { source: { select: { name: true, nameEn: true, sourceType: true } } },
        }),
        type === 'fetch' ? prisma.fetchLog.count({ where: fetchWhere }) : Promise.resolve(0),
      ]);
      logs = fetchLogs.map((l) => ({
        id: l.id,
        type: 'fetch',
        service: l.source?.sourceType || 'unknown',
        sourceName: l.source?.name || l.sourceId,
        status: l.status,
        count: l.count,
        newCount: l.newCount,
        error: l.error,
        duration: l.duration,
        timestamp: l.fetchedAt,
      }));
      total = fetchTotal || fetchLogs.length;
    }

    if (type === 'all' || type === 'financial') {
      const finWhere: Record<string, unknown> = {};
      if (service) finWhere.service = service;
      if (status) finWhere.status = status;

      const [finLogs, finTotal] = await Promise.all([
        prisma.financialFetchLog.findMany({
          where: finWhere,
          orderBy: { fetchedAt: 'desc' },
          skip: type === 'all' ? 0 : (page - 1) * limit,
          take: type === 'all' ? 15 : limit,
        }),
        type === 'financial' ? prisma.financialFetchLog.count({ where: finWhere }) : Promise.resolve(0),
      ]);
      const mapped: LogEntry[] = finLogs.map((l) => ({
        id: l.id,
        type: 'financial',
        service: l.service,
        sourceName: l.endpoint,
        status: l.status,
        count: l.count,
        newCount: null,
        error: l.error,
        duration: l.duration,
        timestamp: l.fetchedAt,
      }));
      logs = type === 'all' ? (logs.concat(mapped) as LogEntry[]).sort((a, b) =>
        b.timestamp.getTime() - a.timestamp.getTime()
      ).slice(0, 30) : mapped;
      total = finTotal || mapped.length;
    }

    return NextResponse.json({
      success: true,
      data: { logs, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    log.error('Admin logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
