'use client'

import { formatDate, truncate, estimateReadingTime } from '@/lib/utils'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import VoiceButton from './VoiceButton'

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

  const initialTranslatedTitle = article.summary?.translatedTitle ?? null
  const initialSummary = article.summary?.summary3Line ?? null
  const [translation, setTranslation] = useState<{ translatedTitle: string; summary3Line?: string } | null>(
    initialTranslatedTitle ? { translatedTitle: initialTranslatedTitle, summary3Line: initialSummary ?? undefined } : null
  )
  const [translating, setTranslating] = useState(false)
  const [translationError, setTranslationError] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  const displayTitle = translation && !showOriginal ? translation.translatedTitle : article.title
  const hasTranslatedSummary = translation?.summary3Line && !showOriginal

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

  const handleTranslate = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (translation) {
      setShowOriginal(prev => !prev)
      return
    }

    if (translating) return

    setTranslating(true)
    setTranslationError(null)

    try {
      const res = await fetch('/api/articles/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id, mode: 'full' }),
      })
      const data = await res.json()
      if (data.success && data.translation) {
        setTranslation({
          translatedTitle: data.translation.translatedTitle || article.title,
          summary3Line: data.translation.summary3Line || undefined,
        })
        setShowOriginal(false)
      } else {
        setTranslationError('번역에 실패했습니다')
      }
    } catch {
      setTranslationError('네트워크 오류')
    } finally {
      setTranslating(false)
    }
  }, [article.id, article.title, translation, translating])

  const renderTranslateButton = () => {
    if (!isEnglish) return null

    if (translating) {
      return (
        <button
          disabled
          className="inline-flex cursor-wait items-center gap-1 rounded-full bg-accent-light px-2 py-0.5 text-xs font-medium text-accent/70"
        >
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          번역 중...
        </button>
      )
    }

    if (translationError && !translation) {
      return (
        <button
          onClick={handleTranslate}
          className="inline-flex items-center gap-1 rounded-full bg-danger-light px-2 py-0.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
          title="다시 시도"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          재시도
        </button>
      )
    }

    return (
      <button
        onClick={handleTranslate}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
          translation
            ? showOriginal
              ? 'bg-primary-light text-primary hover:bg-primary/20'
              : 'bg-accent-light text-accent hover:bg-accent/20'
            : 'bg-accent-light text-accent hover:bg-accent/20'
        }`}
        title={
          translation
            ? showOriginal
              ? '한국어 번역 보기'
              : '영어 원문 보기'
            : 'AI 번역'
        }
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        {translation ? (showOriginal ? '원문' : '번역') : '번역'}
      </button>
    )
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
              {renderTranslateButton()}
              <VoiceButton
                articleId={article.id}
                title={article.title}
                description={article.description}
                language={article.language}
              />
              {article.category && article.category !== source.subcategory && (
                <span className="text-xs text-muted-foreground">{article.category}</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {!isRead && (
                  <button
                    onClick={handleMarkRead}
                    disabled={isLoading || translating}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary-light hover:text-primary"
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
                  disabled={isLoading || translating}
                  className={`rounded p-1 transition-colors ${
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
              className={`block line-clamp-2 word-break-keep-all text-sm font-semibold leading-tight transition-all duration-300 sm:text-base ${
                translation && !showOriginal ? 'text-primary' : 'text-gray-900 group-hover:text-primary'
              }`}
              title={article.title}
            >
              {displayTitle}
              {translation && !showOriginal && (
                <span className="ml-1.5 align-super text-[10px] font-normal text-gray-400">
                  (원문)
                </span>
              )}
            </Link>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                hasTranslatedSummary && !compact ? 'mt-1.5 max-h-24 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <p className="line-clamp-2 text-xs leading-relaxed text-primary/70">
                {truncate(translation!.summary3Line!, 150)}
              </p>
            </div>

            {!compact && article.description && (
              <p className={`text-sm leading-relaxed text-gray-600 transition-opacity duration-200 ${
                hasTranslatedSummary ? 'mt-0.5 text-xs text-gray-400' : 'mt-2'
              }`}>
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
