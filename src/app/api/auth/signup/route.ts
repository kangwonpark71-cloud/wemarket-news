import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/utils/auth';
import { z } from 'zod';
import { validatePhoneNumber, generateVerificationCode, storeVerificationCode, canRequestVerification, sendSMS, isMockMode } from '@/lib/utils/sms';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAuthSignup')

// 회원가입: 전화번호 + 비밀번호만 필요 (이름/이메일은 가입 후 프로필에서 입력)
const signupSchema = z.object({
  password: z.string()
    .min(6, '비밀번호는 최소 6자리 이상이어야 합니다.')
    .regex(/^[0-9]+$/, '비밀번호는 숫자만 포함해야 합니다.'),
  phone: z.string()
    .min(10, '올바른 휴대폰 번호를 입력하세요.')
    .regex(/^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/, '유효한 휴대폰 번호를 입력하세요.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Server-side validation
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError(validationResult.error.issues.map(err => err.message).join(', '), 400);
    }

    const { password, phone } = validationResult.data;

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return apiError(phoneValidation.message, 400);
    }

    // Check if user already exists by phone
    const existingPhone = await prisma.user.findFirst({
      where: { phone: phoneValidation.normalized },
    });

    if (existingPhone) {
      return apiError('이미 등록된 휴대폰 번호입니다.', 409);
    }

    // Rate limiting check for phone verification
    const canRequest = await canRequestVerification(phone);
    if (!canRequest.canRequest) {
      return apiError(canRequest.reason ?? '인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);
    }

    // Hash password securely
    const hashedPassword = hashPassword(password);

    // Create a temporary user record (pending phone verification)
    // email, name, gender, birthDate는 가입 후 프로필 완성 단계에서 입력
    const user = await prisma.user.create({
      data: {
        password: hashedPassword,
        phone: phoneValidation.normalized,
        phoneVerified: false,
        emailVerified: false,
        preferences: {
          create: {
            theme: 'light',
            language: 'all',
            hiddenSources: '',
            pinnedSources: '',
            interests: '',
          },
        },
      },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        role: true,
        createdAt: true,
      },
    });

    const verificationCode = generateVerificationCode();
    await storeVerificationCode(phoneValidation.normalized, verificationCode, user.id);
    
    const smsMessage = `[위마켓뉴스] 인증번호: ${verificationCode}\n이 번호는 5분간 유효합니다.`;
    const smsSent = await sendSMS(phoneValidation.normalized, smsMessage);
    
    if (!smsSent) {
      log.error(`[SMS] ${phoneValidation.normalized}로 SMS 발송 실패`);
    }

    const response: Record<string, unknown> = {
      success: true,
      data: {
        ...user,
        isPhoneVerified: false,
      },
      message: '인증 코드가 휴대전화로 발송되었습니다. 번호를 인증해주세요.',
    };

    if (isMockMode()) {
      response.mockCode = verificationCode;
    }

    return NextResponse.json(response, {
      status: 201,
    });
  } catch (error) {
    log.error('Signup error:', error);
    
    if (error instanceof Error && error.message.includes('P2002')) {
      return apiError('이미 등록된 정보입니다.', 409);
    }
    
    return apiError('회원가입 중 서버 오류가 발생했습니다.', 500);
  }
}
