import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiNewsletterUnsubscribe');

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 주소를 입력해 주셔요.' },
        { status: 400 }
      );
    }

    const result = await deactivateSubscription(email);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: { message: '뉴스레터 구독이 해지되었습니다.' } });
  } catch (error) {
    log.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: '구독 해지에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/** 이메일 뉴스레터 템플릿의 구독해지 링크(?email=)로 접근했을 때 처리하는 GET 핸들러 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? '';

  const result = await deactivateSubscription(email);
  if (!result.success) {
    return new Response(
      renderUnsubscribePage(false, result.error ?? '구독 해지에 실패했습니다.'),
      { status: result.status ?? 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return new Response(
    renderUnsubscribePage(true, '뉴스레터 구독이 해지되었습니다. 그동안 구독해 주셔서 감사합니다.'),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function deactivateSubscription(email: string): Promise<{ success: boolean; error?: string; status?: number }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: '올바른 이메일 주소를 입력해 주셔요.', status: 400 };
  }

  const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
  if (!existing) {
    return { success: false, error: '구독되지 않은 이메일입니다.', status: 404 };
  }

  await prisma.newsletterSubscription.update({
    where: { email },
    data: { isActive: false },
  });

  return { success: true };
}

function renderUnsubscribePage(ok: boolean, message: string): string {
  const emoji = ok ? '✅' : '⚠️';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>뉴스레터 구독 해지</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; background: #f8fafc; color: #0f172a; }
    .card { max-width: 420px; margin: 96px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); padding: 40px 32px; text-align: center; }
    .emoji { font-size: 48px; }
    h1 { font-size: 20px; margin: 16px 0 8px; }
    p { font-size: 14px; color: #475569; line-height: 1.6; margin: 0; }
    a { display: inline-block; margin-top: 24px; color: #6366f1; font-size: 14px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${emoji}</div>
    <h1>${ok ? '구독이 해지되었습니다' : '구독 해지 실패'}</h1>
    <p>${message}</p>
    <a href="/">← 경제뉴스 홈으로 돌아가기</a>
  </div>
</body>
</html>`;
}
