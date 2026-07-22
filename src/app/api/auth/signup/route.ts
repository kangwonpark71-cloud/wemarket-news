import { NextResponse } as NextResponse from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, createSessionToken } from '@/lib/utils/auth';
import { z } from 'zod';
import { validatePhoneNumber, generateVerificationCode, storeVerificationCode, canRequestVerification } from '@/lib/utils/sms';

// Server-side validation schema
const signupSchema = z.object({
  email: z.string().email('올바른 이메일 주소가 아닙니다.'),
  password: z.string()
    .min(6, '비밀번호는 최소 6자리 이상이어야 합니다.')
    .regex(/^[0-9]+$/, '비밀번호는 숫자만 포함해야 합니다.'),
  phone: z.string()
    .min(10, '올바른 휴대폰 번호를 입력하세요.')
    .regex(/^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/, '유효한 휴대폰 번호를 입력하세요.'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.').max(50, '이름은 50자를 초과할 수 없습니다.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Server-side validation
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors.map(err => err.message).join(', ') },
        { status: 400 }
      );
    }

    const { email, password, phone, name } = validationResult.data;

    // Validate phone number format using our new SMS utilities
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists by email
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      );
    }

    // Check if phone number already exists (unique field)
    const existingPhone = await prisma.user.findUnique({
      where: { phone: phoneValidation.normalized },
    });

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 휴대폰 번호입니다.' },
        { status: 409 }
      );
    }

    // Rate limiting check for phone verification
    const canRequest = canRequestVerification(phone);
    if (!canRequest.canRequest) {
      return NextResponse.json(
        { success: false, error: canRequest.reason },
        { status: 429 } // Too Many Requests
      );
    }

    // Hash password securely
    const hashedPassword = hashPassword(password);

    // Create a temporary user record (pending phone verification)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phoneValidation.normalized,
        phoneVerified: false,
        emailVerified: false,
        preferences: {
          create: {
            theme: 'light',
            language: 'all',
            hiddenSources: '',
            pinnedSources: '',
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
        createdAt: true,
      },
    });

    // Generate and store SMS verification code
    const verificationCode = generateVerificationCode();
    storeVerificationCode(phoneValidation.normalized, verificationCode, user.id);
    
    // TODO: 실제로 SMS 서비스를 호출해야 합니다.
    // 개발 환경에서는 로그만 출력하고, 프로덕션 환경에서는 실제 SMS 서비스를 호출해야 합니다.
    console.log(`[SMS Verification] ${phoneValidation.normalized}로 인증 코드 ${verificationCode}를 전송했습니다.`);

    // Return user data without password, with verification status
    return NextResponse.json({
      success: true,
      data: {
        ...user,
        isPhoneVerified: false, // 이메일 인증 단계
      },
      message: '인증 코드가 휴대전화로 발송되었습니다. 번호를 인증해주세요.',
    }, {
      status: 201,
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('P2002')) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 이메일입니다.' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: '회원가입 중 서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
