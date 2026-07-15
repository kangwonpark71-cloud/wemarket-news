import { getArticleById, saveArticleContent } from '@/lib/rss/db-service'
import { scrapeArticleContent } from '@/lib/rss/content-scraper'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: '기사 상세 - 경제뉴스',
  description: '경제 뉴스 기사 전문 보기',
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  if (!article.content) {
    console.log(`[ArticleDetail] Scraping content for ${id}`)
    const result = await scrapeArticleContent(article.url)
    if (result.content) {
      await saveArticleContent(id, result.content)
      article.content = result.content
    }
  }

  const isEnglish = article.language === 'en'
  const source = article.source

  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-8">
        <nav className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isEnglish ? 'Back to news' : '뉴스 목록으로'}
          </Link>
        </nav>

        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span>{source.icon || '📰'}</span>
              <span>{source.name}</span>
            </span>
            {article.category && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                {article.category}
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
              {formatDate(article.publishedAt, isEnglish ? 'en' : 'ko')}
            </time>
            <span className="text-muted-foreground/30">·</span>
            <span className="capitalize">{isEnglish ? 'English' : '한국어'}</span>
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
                {isEnglish
                  ? 'Could not load the full article content.'
                  : '전체 기사 내용을 불러올 수 없습니다.'}
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
                {isEnglish ? 'Read original article' : '원문 보기'}
              </a>
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
              {isEnglish ? 'View original source' : '원문 출처에서 보기'}
            </a>
          </div>
        </div>
      </article>
    </main>
  )
}