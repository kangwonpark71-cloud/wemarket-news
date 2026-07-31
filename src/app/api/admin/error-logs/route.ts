import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/utils/auth';
import { getErrorLogs, getErrorSummary, clearErrorLogs } from '@/lib/services/monitoring/error-log-service';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') || '50'));
    const level = (url.searchParams.get('level') || undefined) as 'error' | 'warn' | 'info' | undefined;
    const source = url.searchParams.get('source') || undefined;
    const withSummary = url.searchParams.get('summary') === 'true';

    const [logs, summary] = await Promise.all([
      getErrorLogs({ page, pageSize, level, source }),
      withSummary ? getErrorSummary() : null,
    ]);

    return NextResponse.json({ success: true, data: logs, summary });
  } catch {
    return NextResponse.json(
      { success: false, error: '로그 조회 실패' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const level = (url.searchParams.get('level') || undefined) as 'error' | 'warn' | 'info' | undefined;
    const source = url.searchParams.get('source') || undefined;
    const count = await clearErrorLogs(level, source);
    return NextResponse.json({ success: true, data: { deleted: count } });
  } catch {
    return NextResponse.json(
      { success: false, error: '로그 삭제 실패' },
      { status: 500 }
    );
  }
}
