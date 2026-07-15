import { getArticleById, saveArticleContent } from '@/lib/rss/db-service'
import { scrapeArticleContent } from '@/lib/rss/content-scraper'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
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
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isEnglish ? 'Back to news' : '뉴스 목록으로'}
        </Link>
      </nav>

      <article>
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <span>{source.icon || '📰'}</span>
              <span>{source.name}</span>
            </span>
            {article.category && (
              <span className="text-sm text-gray-500">{article.category}</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl leading-tight">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {article.author && (
              <>
                <span>{article.author}</span>
                <span className="text-gray-300">|</span>
              </>
            )}
            <time dateTime={article.publishedAt.toISOString()}>
              {formatDate(article.publishedAt, isEnglish ? 'en' : 'ko')}
            </time>
            <span className="text-gray-300">|</span>
            <span>{isEnglish ? 'English' : '한국어'}</span>
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
          <p className="mb-6 text-lg leading-relaxed text-gray-600">
            {article.description}
          </p>
        )}

        {article.content ? (
          <div className="prose prose-gray max-w-none">
            {article.content.split('\n\n').map((paragraph, i) => {
              const trimmed = paragraph.trim()
              if (!trimmed) return null
              if (trimmed.startsWith('- ')) {
                return (
                  <li key={i} className="text-gray-700 leading-relaxed mb-1">
                    {trimmed.slice(2)}
                  </li>
                )
              }
              return (
                <p key={i} className="text-gray-700 leading-relaxed mb-4">
                  {trimmed}
                </p>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
            <p className="mb-2">
              {isEnglish
                ? 'Could not load the full article content.'
                : '전체 기사 내용을 불러올 수 없습니다.'}
            </p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
            >
              {isEnglish ? 'Read original article' : '원문 보기'}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {isEnglish ? 'View original source' : '원문 출처에서 보기'}
          </a>
        </div>
      </article>
    </main>
  )
}
