'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'economy-news:install-prompt-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const elapsed = Date.now() - Number(dismissed);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return; // 7 days
      localStorage.removeItem(STORAGE_KEY);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as Event & { prompt: () => Promise<void> }).prompt();
    const result = await (deferredPrompt as Event & { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 py-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80 md:rounded-sm md:border">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-foreground">
          앱으로 설치하여 더 빠르게 이용하세요
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleInstall}
            className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
          >
            설치
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
            aria-label="닫기"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
