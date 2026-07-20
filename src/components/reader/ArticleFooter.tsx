import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ShareButton } from './ShareButton'
import type { ReaderArticle, ReaderRelatedArticle, ReaderLanguage } from './types'

interface ArticleFooterProps {
  article: ReaderArticle
  related: ReaderRelatedArticle[]
  language: ReaderLanguage
}

export function ArticleFooter({ article, related, language }: ArticleFooterProps) {
  const isKorean = language === 'ko'

  return (
    <footer className="mt-12 border-t border-border pt-8 lg:mt-16">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {isKorean ? '원문 출처에서 보기' : 'View original source'}
        </a>
        <ShareButton
          url={article.url}
          title={article.title}
          language={language}
          className="ml-auto"
        />
      </div>

      {related.length > 0 && (
        <section aria-label={isKorean ? '추천 기사' : 'Recommended Articles'}>
          <h3 className="mb-4 text-base font-bold tracking-tight text-foreground">
            {isKorean ? '회원님을 위한 오늘의 추천 경제 리포트' : 'Recommended Articles for You'}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {related.map((rel) => (
              <Link
                key={rel.id}
                href={`${rel.hrefBase ?? '/articles'}/${rel.id}`}
                className="group flex flex-col rounded-sm border border-border bg-card p-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {rel.source.name}
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {rel.title}
                </span>
                <span className="mt-auto pt-2 text-[10px] text-muted-foreground">
                  {formatDate(rel.publishedAt, isKorean ? 'ko' : 'en')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </footer>
  )
}

