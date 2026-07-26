'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PopularArticle {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  publishedAt: string;
  source: { name: string; nameEn: string } | null;
}

export default function PopularArticles() {
  const [articles, setArticles] = useState<PopularArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/articles/popular?limit=7')
      .then(r => r.json())
      .then(json => { if (json.success) setArticles(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground px-3 py-2">인기글 로딩 중...</div>;
  if (articles.length === 0) return null;

  return (
    <div className="border border-border rounded-sm bg-card">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-xs font-bold text-foreground">🔥 인기 뉴스</h3>
      </div>
      <ul className="divide-y divide-border">
        {articles.map((article, i) => (
          <li key={article.id}>
            <Link
              href={`/articles/${article.id}`}
              className="flex items-start gap-2 px-3 py-2 hover:bg-muted transition-colors"
            >
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground leading-snug line-clamp-2">{article.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {article.source?.name || ''} · 조회 {article.viewCount.toLocaleString()}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
