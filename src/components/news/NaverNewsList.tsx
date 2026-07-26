'use client'

import { type NormalizedNaverArticle } from '@/lib/services/search/naver-news-service'
import NaverNewsCard from './NaverNewsCard'

interface NaverNewsListProps {
  articles: NormalizedNaverArticle[]
  emptyMessage?: string
  compact?: boolean
}

export default function NaverNewsList({ articles, emptyMessage = '뉴스가 없습니다', compact = false }: NaverNewsListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-gray-300 py-16">
        <span className="mb-4 text-4xl">📭</span>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <NaverNewsCard key={article.url} article={article} compact={compact} />
      ))}
    </div>
  )
}
