'use client'

import { formatDate, truncate, estimateReadingTime } from '@/lib/utils'
import { useState } from 'react'
import Link from 'next/link'

interface NewsSummary {
  translatedTitle?: string | null
  summary3Line?: string
  keywords?: string[]
}

interface ArticleBase {
  id: string
  title: string
  url: string
  description?: string | null
  content?: string | null
  author?: string | null
  thumbnail?: string | null
  category?: string | null
  publishedAt: Date
  language: string
  isBookmarked?: boolean
  isRead?: boolean
  source: { id: string; name: string; nameEn?: string | null; category?: string | null; subcategory?: string | null; icon?: string | null }
  summary?: NewsSummary | null
}

interface NewsCardProps {
  article: ArticleBase
  compact?: boolean
}

export default function NewsCard({ article, compact = false }: NewsCardProps) {
  const source = article.source
  const isEnglish = article.language === 'en'
  const readingTime = estimateReadingTime(article.description || article.content, article.language)
  const [isBookmarked, setIsBookmarked] = useState(article.isBookmarked)
  const [isRead, setIsRead] = useState(article.isRead)
  const [isLoading, setIsLoading] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const translatedTitle = article.summary?.translatedTitle
  const displayTitle = isEnglish && translatedTitle && !showOriginal ? translatedTitle : article.title

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/articles/${article.id}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarked: !isBookmarked }),
      })
      if (res.ok) {
        setIsBookmarked(!isBookmarked)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLoading || isRead) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/articles/${article.id}/read`, {
        method: 'POST',
      })
      if (res.ok) {
        setIsRead(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <article
      className={`group relative rounded-sm border transition-colors duration-200 ${
        article.isRead ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white hover:border-primary-light hover:shadow-sm'
      }`}
      style={article.isRead ? { opacity: 0.7 } : {}}
    >
      <div className="p-4">
        <div className="flex gap-4">
          {article.thumbnail && !compact && (
            <div className="relative hidden h-24 w-24 shrink-0 sm:block">
              <img
                src={article.thumbnail}
                alt=""
                className="h-full w-full rounded-sm object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                <span>{source.icon || '📰'}</span>
                <span>{source.name}</span>
              </span>
              {isEnglish && translatedTitle && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowOriginal(!showOriginal)
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                  title={showOriginal ? '한국어 번역 보기' : '영어 원문 보기'}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {showOriginal ? '원문' : '번역'}
                </button>
              )}
              {article.category && article.category !== source.subcategory && (
                <span className="text-xs text-muted-foreground">{article.category}</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {!isRead && (
                  <button
                    onClick={handleMarkRead}
                    disabled={isLoading}
                    className="p-1 rounded hover:bg-primary-light text-muted-foreground hover:text-primary transition-colors"
                    title="읽음으로 표시"
                    aria-label="읽음으로 표시"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleBookmark}
                  disabled={isLoading}
                  className={`p-1 rounded transition-colors ${
                    isBookmarked
                      ? 'bg-danger-light text-danger'
                      : 'text-muted-foreground hover:bg-accent-light hover:text-accent'
                  }`}
                  title={isBookmarked ? '북마크 해제' : '북마크 추가'}
                  aria-label={isBookmarked ? '북마크 해제' : '북마크 추가'}
                  aria-pressed={isBookmarked}
                >
                  <svg
                    className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`}
                    fill={isBookmarked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            <Link
              href={`/articles/${article.id}`}
              className="block line-clamp-2 word-break-keep-all text-sm font-semibold leading-tight text-gray-900 group-hover:text-primary sm:text-base"
              title={article.title}
            >
              {displayTitle}
            </Link>

            {isEnglish && translatedTitle && article.summary?.summary3Line && !compact && (
              <p className="mt-1.5 text-xs leading-relaxed text-primary/70 line-clamp-2">
                {truncate(article.summary.summary3Line, 150)}
              </p>
            )}

            {!compact && article.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {truncate(article.description, isEnglish ? 200 : 150)}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <time dateTime={article.publishedAt.toISOString()}>
                {formatDate(article.publishedAt, article.language as 'ko' | 'en')}
              </time>
              {article.author && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>{article.author}</span>
                </>
              )}
              <span className="text-gray-300">|</span>
              <span className="capitalize">{article.language === 'ko' ? '한국어' : '영어'}</span>
              <span className="text-gray-300">|</span>
              <span>{readingTime}{article.language === 'ko' ? '분' : 'min'}</span>
            </div>
          </div>
        </div>
      </div>
      {!article.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary" />
      )}
    </article>
  )
}