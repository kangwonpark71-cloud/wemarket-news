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

    const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '구독되지 않은 이메일입니다.' },
        { status: 404 }
      );
    }

    await prisma.newsletterSubscription.update({
      where: { email },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, data: { message: '뉴스레터 구독이 해지되었습니다.' } });
  } catch (error) {
    log.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { success: false, error: '구독 해지에 실패했습니다.' },
      { status: 500 }
    );
  }
}
