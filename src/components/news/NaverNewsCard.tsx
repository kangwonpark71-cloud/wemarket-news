'use client'

import { type NormalizedNaverArticle } from '@/lib/services/search/naver-news-service'
import { formatDate, truncate, estimateReadingTime } from '@/lib/utils'

interface NaverNewsCardProps {
  article: NormalizedNaverArticle
  compact?: boolean
}

export default function NaverNewsCard({ article, compact = false }: NaverNewsCardProps) {
  const readingTime = estimateReadingTime(article.description, 'ko')

  return (
    <article className="group relative rounded-sm border border-gray-200 bg-white transition-colors duration-200 hover:border-primary-light hover:shadow-sm">
      <div className="p-4">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                {article.source}
              </span>
            </div>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block line-clamp-2 word-break-keep-all text-sm font-semibold leading-tight text-gray-900 group-hover:text-primary sm:text-base"
              title={article.title}
            >
              {article.title}
            </a>

            {!compact && article.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {truncate(article.description, 150)}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <time dateTime={article.publishedAt.toISOString()}>
                {formatDate(article.publishedAt, 'ko')}
              </time>
              <span className="text-gray-300">|</span>
              <span>네이버 뉴스</span>
              <span className="text-gray-300">|</span>
              <span>{readingTime}분</span>
              {article.originalUrl !== article.url && (
                <>
                  <span className="text-gray-300">|</span>
                  <a
                    href={article.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    원문 보기
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
