'use client';

import { useState } from 'react';
import { INTEREST_OPTIONS } from '@/lib/services/newsletter/newsletter-options';

export function NewsletterWidget() {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (id: string) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          interests: interests.join(','),
          alertKeywords: keywords,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setEmail('');
        setKeywords('');
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
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[10px] text-muted-foreground mb-2">관심 분야를 선택하면 맞춤형 뉴스 다이제스트를 보내드려요. (선택)</p>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((opt) => {
            const active = interests.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleInterest(opt.id)}
                aria-pressed={active}
                className={`h-7 px-3 text-[11px] rounded-full border transition-colors cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'bg-background text-foreground border-border hover:border-primary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-muted-foreground shrink-0">키워드</span>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="금리, 반도체, 연준 (쉼표로 구분, 선택)"
            className="h-8 w-full max-w-xs border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded-sm placeholder:text-muted-foreground"
          />
        </div>
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
