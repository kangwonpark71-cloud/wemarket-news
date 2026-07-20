'use client';

import { useState } from 'react';

export function NewsletterWidget() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setEmail('');
      } else {
        setError(json.error || '구독 신청에 실패했습니다.');
      }
    } catch {
      setError('서버 통신 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 border border-border p-6 bg-card rounded-sm text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">📧 위마켓_뉴스 이메일 뉴스레터 구독</h3>
          <p className="text-[10px] text-muted-foreground mt-1">매주 월요일 아침, 일간 최고의 인기 금융 및 AI 분석 트렌드 리포트를 받아보세요.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0 w-full sm:w-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="h-10 w-full sm:w-64 border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded-sm placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors rounded-sm cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? '신청 중...' : '구독 신청'}
          </button>
        </form>
      </div>
      {success && (
        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2">
          ✓ 성공적으로 이메일 뉴스레터 구독이 완료되었습니다!
        </p>
      )}
      {error && (
        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-2">
          ❌ {error}
        </p>
      )}
    </div>
  );
}

export default NewsletterWidget;
