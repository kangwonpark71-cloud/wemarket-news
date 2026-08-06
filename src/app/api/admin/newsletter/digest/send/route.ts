import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/utils/auth';
import { sendDigestToAll, sendDigestTest, getDigestStats } from '@/lib/services/newsletter/digest-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminNewsletterDigest');

function todayLabel(): string {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401);
  }

  try {
    const stats = await getDigestStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    log.error('Failed to get digest stats:', error);
    return apiError('Failed to get digest stats', 500);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { action, email, subject: customSubject } = body;

    if (action === 'digest-test' && email) {
      const result = await sendDigestTest(
        email,
        customSubject || `[경제뉴스] 맞춤형 뉴스 다이제스트 — ${todayLabel()} (테스트)`,
      );
      if (!result.success) {
        return apiError(result.error ?? '테스트 뉴스 다이제스트 발송에 실패했습니다.', 500);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'digest-send-all') {
      const result = await sendDigestToAll(
        customSubject || `[경제뉴스] 맞춤형 뉴스 다이제스트 — ${todayLabel()}`,
      );
      return NextResponse.json({ success: true, data: result });
    }

    return apiError('Invalid action. Use "digest-test" or "digest-send-all".', 400);
  } catch (error) {
    log.error('Newsletter digest send error:', error);
    return apiError('맞춤형 뉴스 다이제스트 발송에 실패했습니다.', 500);
  }
}
