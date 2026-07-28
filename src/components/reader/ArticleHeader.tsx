import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { calculateReadingTime, formatReadingTime } from '@/lib/reading-time'
import type { ReaderArticle, ReaderLanguage } from './types'
import VoiceButton from '@/components/news/VoiceButton'

interface ArticleHeaderProps {
  article: ReaderArticle
  language: ReaderLanguage
  backHref: string
  backLabel: string
}

export function ArticleHeader({ article, language, backHref, backLabel }: ArticleHeaderProps) {
  const isKorean = language === 'ko'
  const source = article.source

  return (
    <header className="mb-8 sm:mb-12">
      <nav className="mb-6 sm:mb-8" aria-label="브레드크럼">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </Link>
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          {source.icon && <span aria-hidden="true">{source.icon}</span>}
          <span>{source.name}</span>
        </span>
        {(article.category || source.subcategory) && (
          <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {article.category || source.subcategory}
          </span>
        )}
        {article.content && (
          <span className="ml-auto">
            <VoiceButton
              articleId={article.id}
              title={article.originalTitle || article.title}
              content={article.content}
              language={article.language}
            />
          </span>
        )}
      </div>

      <h1 className="text-[1.75rem] leading-[1.25] font-extrabold tracking-tight text-foreground sm:text-[2.25rem] lg:text-[2.75rem] lg:leading-[1.2]">
        {article.title}
      </h1>

      {article.originalTitle && (
        <p className="mt-2 text-sm text-muted-foreground italic">
          {article.originalTitle}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-5 text-xs font-medium text-muted-foreground">
        {article.author && (
          <>
            <span className="font-bold text-foreground">{article.author}</span>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
          </>
        )}
        <time dateTime={article.publishedAt.toISOString()} className="whitespace-nowrap">
          {formatDate(article.publishedAt, isKorean ? 'ko' : 'en')}
        </time>
        <span aria-hidden="true" className="text-muted-foreground/40">·</span>
        <span className="capitalize">{isKorean ? '한국어' : 'English'}</span>
        {article.content && (
          <>
            <span aria-hidden="true" className="text-muted-foreground/40">·</span>
            <span>약 {formatReadingTime(calculateReadingTime(article.content, article.language))} 소요</span>
          </>
        )}
      </div>
    </header>
  )
}
