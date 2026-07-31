'use client';

import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-6xl text-muted-foreground" aria-hidden="true">
        &#x1F4F6;
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">오프라인 상태입니다</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        인터넷 연결이 끊어져 페이지를 불러올 수 없습니다.
        <br />
        연결이 복구되면 자동으로 페이지를 새로고침합니다.
      </p>
      {isOnline && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">
          인터넷이 복구되었습니다. 아래 버튼을 눌러주세요.
        </p>
      )}
      <button
        onClick={handleRetry}
        className="h-10 rounded-sm bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
      >
        다시 시도
      </button>
    </div>
  );
}
