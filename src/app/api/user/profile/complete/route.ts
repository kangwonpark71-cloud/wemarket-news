import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiUserProfileComplete')

const profileCompletionSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.').max(50),
  email: z.string().email('올바른 이메일 주소가 아닙니다.').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other'], {
    error: '성별은 남, 여, 기타 중 하나여야 합니다.',
  }),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력하세요.'),
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

    const { name, email, gender, birthDate, interests } = validationResult.data;

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const updateData: Record<string, unknown> = {
      name,
      gender,
      birthDate: new Date(birthDate),
    };

    if (email && email.trim() !== '') {
      if (email !== sessionUser.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });
        if (existingEmail && existingEmail.id !== sessionUser.id) {
          return NextResponse.json(
            { success: false, error: '이미 사용 중인 이메일입니다.' },
            { status: 409 }
          );
        }
      }
      updateData.email = email;
    }

    const interestsStr = interests.join(',');

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        ...updateData,
        preferences: {
          upsert: {
            where: { userId: sessionUser.id },
            create: {
              theme: 'light',
              language: 'all',
              hiddenSources: '',
              pinnedSources: '',
              interests: interestsStr,
            },
            update: {
              interests: interestsStr,
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        phoneVerified: true,
        gender: true,
        birthDate: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: '프로필이 성공적으로 완료되었습니다.',
    });
  } catch (error) {
    log.error('Profile completion error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 저장 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
