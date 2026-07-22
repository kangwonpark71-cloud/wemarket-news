import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { z } from 'zod';

const profileCompletionSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.').max(50),
  phone: z.string()
    .min(10, '올바른 휴대폰 번호를 입력하세요.')
    .regex(/^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/, '유효한 휴대폰 번호를 입력하세요.'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력하세요.'),
  gender: z.enum(['male', 'female', 'other'], {
    error: '성별은 남, 여, 기타 중 하나여야 합니다.',
  }),
  address: z.object({
    street: z.string().min(1, '도로명 주소를 입력해주세요.'),
    city: z.string().min(1, '시/군/구를 입력해주세요.'),
    state: z.string().min(1, '시/도를 입력해주세요.'),
    zipCode: z.string().min(1, '우편번호를 입력해주세요.'),
    country: z.string().min(1, '국가를 입력해주세요.'),
  }),
  interests: z.array(z.string()).min(1, '적어도 하나의 관심 분야를 선택해주세요.'),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = profileCompletionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues.map(err => err.message).join(', ') },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name,
        preferences: {
          upsert: {
            where: { userId: sessionUser.id },
            create: {
              theme: 'light',
              language: 'all',
              hiddenSources: '',
              pinnedSources: '',
            },
            update: {},
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: '프로필이 성공적으로 완료되었습니다.',
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 저장 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
