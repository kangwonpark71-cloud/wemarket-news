import { getAIITArticleById } from '@/lib/ai-it/db-service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'AI/IT 기사 상세',
  description: 'AI/IT 뉴스 기사 전문 보기',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return formatDate(date)
}

export default async function AIITArticleDetailPage({ params }: Props) {
  const { id } = await params
  const article = await getAIITArticleById(id)
  if (!article) notFound()

  const source = article.source
  const isKorean = article.language === 'ko'
  const backHref = source.category === 'ai' ? '/ai-news' : '/it-news'
  const backLabel = source.category === 'ai'
    ? (isKorean ? 'AI 뉴스 목록으로' : 'Back to AI News')
    : (isKorean ? 'IT 뉴스 목록으로' : 'Back to IT News')

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-8">
        <nav className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {source.icon && <span>{source.icon}</span>}
              <span>{source.name}</span>
            </span>
            {source.subcategory && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                {source.subcategory}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {article.author && (
              <>
                <span className="font-medium text-foreground">{article.author}</span>
                <span className="text-muted-foreground/30">·</span>
              </>
            )}
            <time dateTime={article.publishedAt.toISOString()} className="whitespace-nowrap">
              {formatTimeAgo(article.publishedAt)}
            </time>
            <span className="text-muted-foreground/30">·</span>
            <span className="capitalize">{isKorean ? '한국어' : 'English'}</span>
          </div>
        </header>

        {article.thumbnail && (
          <figure className="mb-8 overflow-hidden rounded-xl">
            <img
              src={article.thumbnail}
              alt=""
              className="w-full h-auto object-cover"
              style={{ maxHeight: '400px' }}
              loading="lazy"
            />
          </figure>
        )}

        {article.description && (
          <div className="mb-8 p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {article.description}
            </p>
          </div>
        )}

        <div className="word-break-keep-all">
          {article.content ? (
            <MarkdownRenderer content={article.content} />
          ) : (
            <div className="rounded-xl bg-muted/50 p-8 text-center text-muted-foreground border border-border">
              <p className="mb-4 text-lg">
                {isKorean
                  ? '전체 기사 내용을 불러올 수 없습니다.'
                  : 'Could not load the full article content.'}
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {isKorean ? '원문 보기' : 'Read original article'}
              </a>
            </div>
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 mb-6 flex flex-wrap gap-2">
              {article.tags.map((t, i) => (
                <span
                  key={t.tag.name}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  #{t.tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10 border-t border-border pt-6">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {isKorean ? '원문 출처에서 보기' : 'View original source'}
            </a>
          </div>
        </div>
      </article>
    </main>
  )
}