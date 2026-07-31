'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'global-error-boundary',
        message: error.message || 'Unhandled client error',
        stack: error.stack,
        context: { digest: error.digest, url: typeof window !== 'undefined' ? window.location.href : null },
      }),
      keepalive: true,
      }).catch((reportErr) => console.error('Failed to report error:', reportErr));
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">예기치 않은 오류가 발생했습니다</h1>
          <p className="text-sm text-slate-500 mb-6">잠시 후 다시 시도해주세요.</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary-hover transition-colors cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
