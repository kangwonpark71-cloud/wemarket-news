'use strict';

import { prisma } from '@/lib/db';

import { createLogger } from '@/lib/logger'
const log = createLogger('SMS')

export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export function isMockMode(): boolean {
  return (
    !process.env.SMS_PROVIDER ||
    process.env.SMS_PROVIDER === 'mock' ||
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_PHONE_NUMBER
  );
}

export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const config: SMSConfig = {
    provider: (process.env.SMS_PROVIDER as 'twilio' | 'aws-sns' | 'mock') || 'mock',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
  };

  if (config.provider === 'mock' || !config.accountSid || !config.authToken || !config.fromNumber) {
    log.log(`[SMS Mock] ${phone}로 메시지 발송 시뮬레이션: ${message}`);
    return true;
  }

  if (config.provider === 'twilio') {
    try {
      const twilio = (await import('twilio')).default;
      const client = twilio(config.accountSid, config.authToken);
      
      await client.messages.create({
        body: message,
        from: config.fromNumber,
        to: phone,
      });
      
      log.log(`[SMS Twilio] ${phone}로 SMS 발송 성공`);
      return true;
    } catch (error) {
      log.error(`[SMS Twilio] ${phone}로 SMS 발송 실패:`, error);
      return false;
    }
  }

  log.log(`[SMS Mock] ${phone}로 메시지 발송 시뮬레이션: ${message}`);
  return true;
}

// DB-based verification code storage (User 모델의 verificationCode/verificationExpires 필드 활용)
// In-memory store는 더 이상 사용하지 않음 (서버 재시작 시 코드 유실 방지)

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeVerificationCode(
  _phone: string,
  code: string,
  userId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: code,
        verificationExpires: expiresAt,
      },
    });
  }
}

export async function verifyCode(phone: string, inputCode: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { phone },
    select: {
      id: true,
      verificationCode: true,
      verificationExpires: true,
    },
  });

  if (!user || !user.verificationCode || !user.verificationExpires) {
    return false;
  }

  if (new Date() > user.verificationExpires) {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: null, verificationExpires: null },
    });
    return false;
  }

  const isValid = codeTimingsafeEqual(inputCode, user.verificationCode);

  if (isValid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: null, verificationExpires: null },
    });
  }

  return isValid;
}

/**
 * 전화번호 유효성 검사 (한국 휴대폰 번호 형식)
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  normalized: string;
  message: string;
} {
  // 한국 휴대폰 번호 정규식 (010-0000-0000, 010 0000 0000, 010000000000)
  const clean = phone.replace(/[-\s]/g, '');
  
  // 010 또는 011/016/017/018/019로 시작하는 11자리 번호
  const phoneRegex = /^(010|011|016|017|018|019)\d{7,8}$/;
  
  if (!phoneRegex.test(clean)) {
    return {
      isValid: false,
      normalized: phone,
      message: '유효한 휴대폰 번호를 입력하세요. (예: 010-0000-0000)',
    };
  }
  
  // -를 제외한 기본 형태로 변환
  const normalized = clean.replace(/(^010|\d{4})(?=\d{4})/g, '$1-');
  
  return {
    isValid: true,
    normalized,
    message: '',
  };
}

export async function canRequestVerification(phone: string): Promise<{
  canRequest: boolean;
  reason?: string;
  waitTime?: number;
}> {
  const user = await prisma.user.findFirst({
    where: { phone },
    select: {
      verificationCode: true,
      verificationExpires: true,
    },
  });

  if (!user || !user.verificationCode || !user.verificationExpires) {
    return { canRequest: true };
  }

  if (new Date() < user.verificationExpires) {
    const waitTime = Math.max(0, user.verificationExpires.getTime() - Date.now());
    return {
      canRequest: false,
      reason: `인증 코드가 발송되었습니다. ${Math.ceil(waitTime / 1000)}초 후 재전송 가능합니다.`,
      waitTime,
    };
  }

  return { canRequest: true };
}

function codeTimingsafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}