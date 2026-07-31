'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function OfflinePage() {
  const { t } = useI18n();
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
      <h1 className="mb-2 text-2xl font-bold text-foreground">{t('offline.title')}</h1>
      <p className="mb-8 text-sm text-muted-foreground whitespace-pre-line">
        {t('offline.description')}
      </p>
      {isOnline && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">
          {t('offline.restored')}
        </p>
      )}
      <button
        onClick={handleRetry}
        className="h-10 rounded-sm bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
      >
        {t('offline.retry')}
      </button>
    </div>
  );
}
