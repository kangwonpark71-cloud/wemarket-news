import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiNewsletterSubscribe')

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 주소를 입력해 주셔요.' },
        { status: 400 }
      );
    }

    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: { isActive: true },
      create: { email, isActive: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { success: false, error: '구독 신청에 실패했습니다.' },
      { status: 500 }
    );
  }
}
