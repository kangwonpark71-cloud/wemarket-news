'use strict';

// SMS Verification Utilities
// 관리자가 설정해야 하는 SMS 서비스 키 (Twilio, AWS SNS 등)
export interface SMSConfig {
  provider: 'twilio' | 'aws-sns' | 'mock'; // mock for dev/test
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
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
    console.log(`[SMS Mock] ${phone}로 메시지 발송 시뮬레이션: ${message}`);
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
      
      console.log(`[SMS Twilio] ${phone}로 SMS 발송 성공`);
      return true;
    } catch (error) {
      console.error(`[SMS Twilio] ${phone}로 SMS 발송 실패:`, error);
      return false;
    }
  }

  console.log(`[SMS Mock] ${phone}로 메시지 발송 시뮬레이션: ${message}`);
  return true;
}

// In-memory store for verification codes (Redis나 Database로 대체 권장)
// Production에서는 Redis나 Database 사용을 권장하며, 테스트용 모의 메모리 저장소입니다.
interface VerificationStore {
  [phone: string]: {
    code: string;
    expiresAt: number;
    attempts: number;
    userId?: string; // Pending user creation 시 필요
    createdAt: number;
  };
}

// Development/Test용 메모리 저장소
const verificationStore: VerificationStore = {};

/**
 * 6자리 숫자 인증 코드 생성 (고유한 문자열을 생성합니다.)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 100000 - 999999
}

/**
 * 전화번호 인증 코드 저장 (코인틱성과 만료시간 포함)
 */
export function storeVerificationCode(
  phone: string,
  code: string,
  userId?: string
): void {
  // 1일치 실패마다 지연 시간 증가 (무차별 시도 방지)
  const existing = verificationStore[phone];
  const delay = existing ? Math.min(existing.attempts, 3) * 1000 : 0;
  
  verificationStore[phone] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5분 유효 (300000ms)
    attempts: existing ? existing.attempts + 1 : 0,
    userId,
    createdAt: Date.now() + delay,
  };
}

/**
 * 전화번호로 인증 코드 조회
 */
export function getStoredVerificationCode(phone: string): {
  code: string;
  expiresAt: number;
  attempts: number;
  userId?: string;
  createdAt: number;
} | null {
  const data = verificationStore[phone];
  if (!data) return null;
  
  // 만료되지 않았는지 확인
  if (Date.now() > data.expiresAt) {
    delete verificationStore[phone];
    return null;
  }
  
  return data;
}

/**
 * 인증 코드 검증 및 삭제 (검증 성공 후)
 */
export function verifyCode(phone: string, inputCode: string): boolean {
  const data = verificationStore[phone];
  if (!data) return false;
  
  // 만료 여부 확인
  if (Date.now() > data.expiresAt) {
    delete verificationStore[phone];
    return false;
  }
  
  // 시도 횟수 제한 (최대 5회)
  if (data.attempts >= 5) {
    delete verificationStore[phone];
    return false;
  }
  
  // 타이밍 공격 방지 (timing-safe 비교)
  const isValid = codeTimingsafeEqual(inputCode, data.code);
  
  if (isValid) {
    // 성공 시 삭제 (한 번만 사용 가능)
    delete verificationStore[phone];
  }
  
  return isValid;
}

/**
 * 사용자 전화번호 업데이트 및 인증 상태 설정
 */
export async function verifyAndUpdatePhone(
  phone: string,
  inputCode: string,
  updateFn: (phone: string, verified: boolean) => Promise<void>
): Promise<boolean> {
  const isValid = verifyCode(phone, inputCode);
  if (isValid) {
    await updateFn(phone, true);
    return true;
  }
  return false;
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

/**
 * 인증 상태 확인 (rate limiting 포함)
 */
export function canRequestVerification(phone: string): {
  canRequest: boolean;
  reason?: string;
  waitTime?: number;
} {
  const data = verificationStore[phone];
  if (!data) {
    return { canRequest: true };
  }
  
  // 코드가 아직 유효한 경우 (재전송 방지)
  if (Date.now() < data.expiresAt) {
    const waitTime = Math.max(0, data.expiresAt - Date.now());
    return {
      canRequest: false,
      reason: `인증 코드가 발송되었습니다. ${Math.ceil(waitTime / 1000)}초 후 재전송 가능합니다.`,
      waitTime: waitTime,
    };
  }
  
  // 시도 횟수 제한 확인
  const attempts = data.attempts;
  if (attempts >= 5) {
    // 30분 동안 차단
    const blockEnd = data.createdAt + 30 * 60 * 1000;
    if (Date.now() < blockEnd) {
      const waitTime = Math.max(0, blockEnd - Date.now());
      return {
        canRequest: false,
        reason: `너무 많은 시도 횟수입니다. ${Math.ceil(waitTime / 1000)}초 후 다시 시도하세요.`,
        waitTime: waitTime,
      };
    } else {
      // 차단 해제, 재시도 가능
      delete verificationStore[phone];
    }
  }
  
  return { canRequest: true };
}

/**
 * 타이밍 공격 방지를 위한 안전한 문자열 비교
 */
function codeTimingsafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * 저장소 정리 (만료된 항목 정리)
 */
export function cleanupExpiredCodes(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const phone of Object.keys(verificationStore)) {
    if (now > verificationStore[phone].expiresAt) {
      delete verificationStore[phone];
      cleaned++;
    }
  }
  
  return cleaned;
}