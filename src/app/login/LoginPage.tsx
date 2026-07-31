'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2;

interface PhoneValidation {
  isValid: boolean;
  message: string;
}

function validatePhoneRaw(phone: string): PhoneValidation {
  const clean = phone.replace(/[-\s]/g, '');
  if (clean.length === 0) return { isValid: false, message: '' };
  const regex = /^(010|011|016|017|018|019)\d{7,8}$/;
  if (!regex.test(clean)) {
    return { isValid: false, message: '유효한 휴대폰 번호를 입력하세요. (예: 010-1234-5678)' };
  }
  return { isValid: true, message: '' };
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isPhoneInput(value: string): boolean {
  const clean = value.replace(/[-\s]/g, '');
  return /^(010|011|016|017|018|019)\d{0,8}$/.test(clean);
}

function validatePassword(pw: string): string {
  if (pw.length < 6) return '비밀번호는 6자리 이상이어야 합니다.';
  if (!/^\d+$/.test(pw)) return '비밀번호는 숫자만 포함해야 합니다.';
  return '';
}

export function LoginPage() {
  // --- Mode & step ---
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>(1);

  // --- Login fields ---
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // --- Signup fields ---
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // --- UI state ---
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [mockCode, setMockCode] = useState<string | null>(null);

  // --- Timer ---
  const [timerSeconds, setTimerSeconds] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneValidation = phoneTouched ? validatePhoneRaw(phone) : { isValid: false, message: '' };

  // --- Timer countdown ---
  useEffect(() => {
    if (signupStep === 2 && signupSuccess) {
      setTimerSeconds(300);
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [signupStep, signupSuccess]);

  const resetAll = useCallback(() => {
    setLoginInput('');
    setLoginPassword('');
    setPassword('');
    setPhone('');
    setPhoneTouched(false);
    setVerificationCode('');
    setError(null);
    setLoading(false);
    setSignupSuccess(false);
    setSignupStep(1);
    setMockCode(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const resetToLogin = useCallback(() => {
    setAuthMode('login');
    resetAll();
  }, [resetAll]);

  const switchToSignup = useCallback(() => {
    setAuthMode('signup');
    resetAll();
  }, [resetAll]);

  // --- Login submit ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { password: loginPassword };
      if (isPhoneInput(loginInput)) {
        body.phone = loginInput;
      } else {
        body.email = loginInput;
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        window.location.href = json.data?.role === 'ADMIN' ? '/admin' : '/settings';
      } else {
        setError(json.error || '인증에 실패했습니다.');
      }
    } catch {
      setError('서버와의 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // --- Signup Step 1 → Step 2 (전화번호 + 비밀번호 → 인증번호 발송) ---
  const handleSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pv = validatePhoneRaw(phone);
    if (!pv.isValid) {
      setPhoneTouched(true);
      setError(pv.message);
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, phone }),
      });
      const json = await res.json();
      if (json.success) {
        setSignupSuccess(true);
        setSignupStep(2);
        if (json.mockCode) {
          setMockCode(json.mockCode);
        }
      } else {
        setError(json.error || '회원가입 중 오류가 발생했습니다.');
      }
    } catch {
      setError('서버와의 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // --- Verify phone ---
  const handleVerify = async () => {
    setError(null);
    if (verificationCode.length !== 6) {
      setError('인증 코드는 6자리 숫자여야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode }),
      });
      const json = await res.json();
      if (json.success) {
        // 인증 성공 → 프로필 완성 페이지로 이동
        window.location.href = '/profile-completion';
      } else {
        setError(json.error || '인증에 실패했습니다.');
        setVerificationCode('');
      }
    } catch {
      setError('서버와의 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // --- Resend code ---
  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, phone }),
      });
      const json = await res.json();
      if (json.success) {
        setTimerSeconds(300);
        setVerificationCode('');
        if (json.mockCode) {
          setMockCode(json.mockCode);
        }
      } else {
        setError(json.error || '재전송에 실패했습니다.');
      }
    } catch {
      setError('서버와의 통신에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // --- Phone input change with auto-format ---
  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneInput(value));
  };

  // --- Timer display ---
  const timerMin = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const timerSec = String(timerSeconds % 60).padStart(2, '0');

  // ==================== LOGIN MODE ====================
  if (authMode === 'login') {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="border border-border bg-card p-8 rounded-sm">
          <div className="text-center mb-8">
            <span className="text-4xl" aria-hidden="true">📰</span>
            <h1 className="text-xl font-bold text-foreground mt-4">위마켓_뉴스 로그인</h1>
            <p className="text-xs text-muted-foreground mt-1">
              로그인하여 나만의 맞춤 필터링 설정을 적용하세요.
            </p>
          </div>

          {error && (
            <div className="mb-4 border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-xs text-red-600 dark:text-red-400 rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-input" className="block text-xs font-semibold text-foreground mb-1">
                이메일 또는 휴대폰 번호
              </label>
              <input
                id="login-input"
                type="text"
                required
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="010-1234-5678"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-foreground mb-1">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? '처리 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">간편 로그인</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/api/auth/oauth/login?provider=google"
                className="flex h-10 items-center justify-center gap-2 rounded-sm border border-border bg-background text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </a>
              <a
                href="/api/auth/oauth/login?provider=kakao"
                className="flex h-10 items-center justify-center gap-2 rounded-sm border border-transparent bg-[#FEE500] text-xs font-semibold text-[#191919] transition-colors hover:bg-[#FDD800]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#191919" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 5.58 2 10c0 2.73 1.58 5.14 4 6.71L4.5 20l4.36-2.9c.37.06.75.1 1.14.1 5.52 0 10-3.58 10-8S17.52 2 12 2z" opacity="0.1"/>
                  <text x="6" y="16" fontSize="12" fontWeight="bold">K</text>
                </svg>
                Kakao
              </a>
            </div>
          </div>

          <div className="text-center mt-6 pt-6 border-t border-border">
            <button
              onClick={switchToSignup}
              className="text-xs text-primary hover:underline font-semibold cursor-pointer"
            >
              아직 계정이 없으신가요? 회원가입
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SIGNUP MODE ====================
  const stepLabels = ['전화번호 / 비밀번호', '인증'];

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="border border-border bg-card p-8 rounded-sm">
        <div className="text-center mb-6">
          <span className="text-4xl" aria-hidden="true">📰</span>
          <h1 className="text-xl font-bold text-foreground mt-4">위마켓_뉴스 회원가입</h1>
          <p className="text-xs text-muted-foreground mt-1">
            전화번호와 비밀번호로 간단히 가입하세요.<br />
            가입 후 관심 분야 등 추가 정보를 입력할 수 있습니다.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{stepLabels[signupStep - 1]}</span>
            <span>{signupStep}/2</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(signupStep / 2) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {stepLabels.map((label, i) => (
              <span
                key={label}
                className={`text-[10px] ${i + 1 <= signupStep ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-xs text-red-600 dark:text-red-400 rounded-sm">
            {error}
          </div>
        )}

        {/* ===== Step 1: Phone + Password ===== */}
        {signupStep === 1 && (
          <form onSubmit={handleSignupStep1} className="space-y-4">
            <div>
              <label htmlFor="signup-phone" className="block text-xs font-semibold text-foreground mb-1">
                휴대폰 번호 *
              </label>
              <div className="relative">
                <input
                  id="signup-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="010-1234-5678"
                  maxLength={13}
                  autoFocus
                  className={`h-10 w-full rounded-sm border bg-background px-3 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    phoneTouched
                      ? phoneValidation.isValid
                        ? 'border-green-500'
                        : phone.length > 0
                          ? 'border-red-500'
                          : 'border-border'
                      : 'border-border'
                  }`}
                />
                {phoneTouched && phone.length > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">
                    {phoneValidation.isValid ? (
                      <span className="text-green-500" aria-label="유효한 번호">&#10003;</span>
                    ) : (
                      <span className="text-red-500" aria-label="유효하지 않은 번호">&#10007;</span>
                    )}
                  </span>
                )}
              </div>
              {phoneTouched && phone.length > 0 && !phoneValidation.isValid && (
                <p className="text-[10px] text-red-500 mt-1">{phoneValidation.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-foreground mb-1">
                비밀번호 *
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자리 이상 숫자"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1">비밀번호는 6자리 이상 숫자만 가능합니다.</p>
            </div>

            <button
              type="submit"
              disabled={loading || (phoneTouched && !phoneValidation.isValid)}
              className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? '전송 중...' : '인증번호 발송'}
            </button>
          </form>
        )}

        {/* ===== Step 2: Verification Code ===== */}
        {signupStep === 2 && (
          <div className="space-y-4">
            {mockCode && (
              <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-sm p-3">
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  📋 개발 모드 — 인증번호
                </p>
                <p className="text-lg font-mono font-bold text-amber-800 dark:text-amber-200 tracking-[0.3em] text-center">
                  {mockCode}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 text-center">
                  Twilio가 설정되지 않아 화면에 표시됩니다.
                </p>
              </div>
            )}
            <div className="bg-secondary/50 rounded-sm p-3 text-center">
              <p className="text-xs text-muted-foreground">
                인증 코드가 <span className="font-semibold text-foreground">{phone}</span>로 발송되었습니다.
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                남은 시간: <span className={`font-mono font-semibold ${timerSeconds < 60 ? 'text-red-500' : 'text-foreground'}`}>{timerMin}:{timerSec}</span>
              </p>
            </div>

            <div>
              <label htmlFor="verify-code" className="block text-xs font-semibold text-foreground mb-1">
                인증 번호 (6자리)
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(val);
                }}
                placeholder="000000"
                autoFocus
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6 || timerSeconds === 0}
              className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? '인증 중...' : '인증하기'}
            </button>

            <button
              onClick={handleResend}
              disabled={loading || timerSeconds > 240}
              className="h-10 w-full border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors rounded-sm cursor-pointer disabled:opacity-50"
            >
              {timerSeconds > 240 ? `재전송 (${timerSeconds - 240}초 후)` : '재전송'}
            </button>

            <button
              onClick={() => { setSignupStep(1); setError(null); setVerificationCode(''); }}
              className="h-10 w-full border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors rounded-sm cursor-pointer"
            >
              이전
            </button>
          </div>
        )}

        <div className="text-center mt-6 pt-6 border-t border-border">
          <button
            onClick={resetToLogin}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
