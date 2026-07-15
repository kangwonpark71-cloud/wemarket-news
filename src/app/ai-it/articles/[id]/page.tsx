import { getAIITArticleById } from '@/lib/ai-it/db-service'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
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
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {source.icon && <span>{source.icon}</span>}
              <span>{source.name}</span>
            </span>
            {source.subcategory && (
              <span className="text-sm text-muted-foreground">{source.subcategory}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground sm:text-3xl leading-tight">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {article.author && (
              <>
                <span>{article.author}</span>
                <span className="text-muted-foreground/30">|</span>
              </>
            )}
            <time dateTime={article.publishedAt.toISOString()}>
              {formatTimeAgo(article.publishedAt)}
            </time>
            <span className="text-muted-foreground/30">|</span>
            <span>{isKorean ? '한국어' : 'English'}</span>
          </div>
        </header>

        {article.thumbnail && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={article.thumbnail}
              alt=""
              className="w-full object-cover"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {article.description && (
          <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
            {article.description}
          </p>
        )}

        {article.content ? (
          <div className="prose prose-gray max-w-none dark:prose-invert">
            {article.content.split('\n\n').map((paragraph, i) => {
              const trimmed = paragraph.trim()
              if (!trimmed) return null
              if (trimmed.startsWith('- ')) {
                return (
                  <li key={i} className="text-foreground/80 leading-relaxed mb-1">
                    {trimmed.slice(2)}
                  </li>
                )
              }
              return (
                <p key={i} className="text-foreground/80 leading-relaxed mb-4">
                  {trimmed}
                </p>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-6 text-center text-muted-foreground">
            <p className="mb-2">
              {isKorean
                ? '전체 기사 내용을 불러올 수 없습니다.'
                : 'Could not load the full article content.'}
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
            >
              {isKorean ? '원문 보기' : 'Read original article'}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-2">
            {article.tags?.map((t) => (
              <span
                key={t.tag.id}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                #{t.tag.name}
              </span>
            ))}
          </div>

          <div className="mt-4">
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
