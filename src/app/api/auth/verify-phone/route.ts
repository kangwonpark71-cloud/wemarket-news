import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { verifyCode, validatePhoneNumber } from '@/lib/utils/sms';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAuthVerifyphone')

// Phone verification schema
const verifyPhoneSchema = z.object({
  phone: z.string()
    .min(10, '올바른 휴대폰 번호를 입력하세요.')
    .regex(/^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/, '유효한 휴대폰 번호를 입력하세요.'),
  code: z.string()
    .length(6, '인증 코드는 6자리 숫자여야 합니다.')
    .regex(/^[0-9]+$/, '인증 코드는 숫자만 포함해야 합니다.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Server-side validation
    const validationResult = verifyPhoneSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError(validationResult.error.issues.map(err => err.message).join(', '), 400);
    }

    const { phone, code } = validationResult.data;
    const phoneValidation = validatePhoneNumber(phone);
    const normalizedPhone = phoneValidation.normalized;

    // Verify the code
    const isValid = await verifyCode(normalizedPhone, code);
    if (!isValid) {
      return apiError('인증 코드가 올바르지 않거나 만료되었습니다.', 400);
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      return apiError('사용자 정보를 찾을 수 없습니다.', 404);
    }

    // Update user phone verification status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phoneVerified: true,
        verifiedAt: new Date(),
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

    // Create session token
    const { createSessionToken } = await import('@/lib/utils/auth');
    const token = await createSessionToken(updatedUser.id);

    const response = NextResponse.json({
      success: true,
      data: updatedUser,
      message: '휴대폰 인증이 완료되었습니다. 프로필을 완성해주세요.',
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    log.error('Phone verification error:', error);
    return apiError('인증 중 서버 오류가 발생했습니다.', 500);
  }
}