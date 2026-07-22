import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/utils/auth';
import { validatePhoneNumber } from '@/lib/utils/sms';

export async function POST(request: Request) {
  try {
    const { email, password, phone } = await request.json();

    // Support both email and phone login
    if (!password) {
      return NextResponse.json(
        { success: false, error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    let user = null;
    let isPhoneLogin = false;

    // Check if phone login attempt
    if (phone) {
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { success: false, error: phoneValidation.message },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { phone: phoneValidation.normalized },
      });
      isPhoneLogin = true;
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (!user) {
      // Provide generic error message for security (don't reveal whether email/phone exists)
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // Check if phone login but phone not verified
    if (isPhoneLogin && !user.phoneVerified) {
      return NextResponse.json(
        { success: false, error: '휴대폰 인증이 필요합니다. 인증 코드를 받아주세요.' },
        { status: 403 }
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    const token = createSessionToken(user.id);

    const response = NextResponse.json({
      success: true,
      data: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        role: user.role 
      },
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인에 실패했습니다.' },
      { status: 500 }
    );
  }
}
