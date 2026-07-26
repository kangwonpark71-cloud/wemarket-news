'use client';

import { useEffect } from 'react';

export default function TrackView({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (!articleId || navigator.webdriver) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    navigator.sendBeacon('/api/articles/view', JSON.stringify({ id: articleId }));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [articleId]);
  return null;
}
