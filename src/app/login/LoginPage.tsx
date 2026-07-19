'use client';

import { useState } from 'react';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await fetch(endpoint, {
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

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="border border-border bg-card p-8 rounded-sm">
        <div className="text-center mb-8">
          <span className="text-4xl" aria-hidden="true">📰</span>
          <h1 className="text-xl font-bold text-foreground mt-4">
            {isLogin ? '위마켓_뉴스 로그인' : '위마켓_뉴스 회원가입'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isLogin
              ? '로그인하여 나만의 맞춤 필터링 설정을 적용하세요.'
              : '간단히 가입하고 관심 있는 뉴스 정보만 핀고정하세요.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-xs text-red-600 dark:text-red-400 rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name-input" className="block text-xs font-semibold text-foreground mb-1">
                이름
              </label>
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label htmlFor="email-input" className="block text-xs font-semibold text-foreground mb-1">
              이메일 주소
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@news.com"
              className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password-input" className="block text-xs font-semibold text-foreground mb-1">
              비밀번호
            </label>
            <input
              id="password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 w-full rounded-sm border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입 완료'}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-border">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
