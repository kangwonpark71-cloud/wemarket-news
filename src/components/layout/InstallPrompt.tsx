'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'economy-news:install-prompt-dismissed';

export function InstallPrompt() {
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const elapsed = Date.now() - Number(dismissed);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem(STORAGE_KEY);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      promptEvent.prompt();
      promptEvent.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }
      });
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return null;
}
