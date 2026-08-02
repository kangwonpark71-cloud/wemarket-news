import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiNewsletterSubscribe')

export async function POST(request: Request) {
  try {
    const { email, interests, alertKeywords } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 주소를 입력해 주셔요.' },
        { status: 400 }
      );
    }

    const clean = (value: unknown): string =>
      typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean).join(',').slice(0, 200) : '';

    const interestsValue = clean(interests);
    const alertKeywordsValue = clean(alertKeywords);

    await prisma.newsletterSubscription.upsert({
      where: { email },
      update: { isActive: true, interests: interestsValue, alertKeywords: alertKeywordsValue },
      create: { email, isActive: true, interests: interestsValue, alertKeywords: alertKeywordsValue },
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
