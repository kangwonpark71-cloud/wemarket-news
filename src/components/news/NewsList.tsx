'use client'

import { ArticleWithSource } from '@/lib/rss/db-service'
import NewsCard from './NewsCard'

interface NewsListProps {
  articles: ArticleWithSource[]
  emptyMessage?: string
  compact?: boolean
}

export default function NewsList({ articles, emptyMessage = '뉴스가 없습니다', compact = false }: NewsListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16">
        <span className="mb-4 text-4xl">📭</span>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} compact={compact} />
      ))}
    </div>
  )
}