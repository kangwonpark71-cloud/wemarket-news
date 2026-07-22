'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type AuthMode = 'login' | 'signup';
type SignupStep = 1 | 2 | 3;

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // --- UI state ---
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // --- Timer ---
  const [timerSeconds, setTimerSeconds] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phoneValidation = phoneTouched ? validatePhoneRaw(phone) : { isValid: false, message: '' };

  // --- Timer countdown ---
  useEffect(() => {
    if (signupStep === 3 && signupSuccess) {
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

  const resetToLogin = useCallback(() => {
    setAuthMode('login');
    setSignupStep(1);
    setLoginInput('');
    setLoginPassword('');
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setPhoneTouched(false);
    setVerificationCode('');
    setError(null);
    setLoading(false);
    setSignupSuccess(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

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

  // --- Signup Step 1 → 2 ---
  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || name.trim().length < 2) {
      setError('이름은 2자 이상 입력해주세요.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setSignupStep(2);
  };

  // --- Signup Step 2 → 3 (call signup API) ---
  const handleSignupStep2 = async () => {
    setError(null);
    setPhoneTouched(true);
    const pv = validatePhoneRaw(phone);
    if (!pv.isValid) {
      setError(pv.message);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
          phone,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSignupSuccess(true);
        setSignupStep(3);
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
        window.location.href = '/settings';
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
        body: JSON.stringify({
          email,
          password,
          name: name.trim(),
          phone,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTimerSeconds(300);
        setVerificationCode('');
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
                placeholder="example@news.com 또는 010-0000-0000"
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

          <div className="text-center mt-6 pt-6 border-t border-border">
            <button
              onClick={resetToLogin}
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
  const stepLabels = ['기본 정보', '전화번호', '인증'];

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="border border-border bg-card p-8 rounded-sm">
        <div className="text-center mb-6">
          <span className="text-4xl" aria-hidden="true">📰</span>
          <h1 className="text-xl font-bold text-foreground mt-4">위마켓_뉴스 회원가입</h1>
          <p className="text-xs text-muted-foreground mt-1">
            간단히 가입하고 관심 있는 뉴스 정보만 핀고정하세요.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{stepLabels[signupStep - 1]}</span>
            <span>{signupStep}/3</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(signupStep / 3) * 100}%` }}
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

        {/* ===== Step 1: Basic Info ===== */}
        {signupStep === 1 && (
          <form onSubmit={handleSignupStep1} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="block text-xs font-semibold text-foreground mb-1">
                이름
              </label>
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-foreground mb-1">
                이메일 주소
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@news.com"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-xs font-semibold text-foreground mb-1">
                비밀번호
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
              className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer"
            >
              다음
            </button>
          </form>
        )}

        {/* ===== Step 2: Phone Input ===== */}
        {signupStep === 2 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="signup-phone" className="block text-xs font-semibold text-foreground mb-1">
                휴대폰 번호
              </label>
              <div className="relative">
                <input
                  id="signup-phone"
                  type="tel"
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

            <button
              onClick={handleSignupStep2}
              disabled={loading || (phoneTouched && !phoneValidation.isValid)}
              className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? '전송 중...' : '인증번호 발송'}
            </button>

            <button
              onClick={() => { setSignupStep(1); setError(null); }}
              className="h-10 w-full border border-border bg-background text-foreground text-xs font-semibold hover:bg-secondary transition-colors rounded-sm cursor-pointer"
            >
              이전
            </button>
          </div>
        )}

        {/* ===== Step 3: Verification Code ===== */}
        {signupStep === 3 && (
          <div className="space-y-4">
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
              onClick={() => { setSignupStep(2); setError(null); setVerificationCode(''); }}
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
