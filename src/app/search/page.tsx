import { getArticles, type ArticleWithSource } from '@/lib/rss/db-service'
import { searchAIITNews } from '@/lib/ai-it/search-service'
import NewsCard from '@/components/news/NewsCard'
import { SearchBar } from '@/components/search/SearchBar'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    scope?: string
    sortBy?: string
    page?: string
  }>
}

const SCOPE_LABELS: Record<string, string> = {
  all: '전체',
  domestic: '국내 경제',
  'ai-it': 'AI·IT',
}

export const metadata = {
  title: '뉴스 검색',
  description: '국내 경제와 AI·IT 뉴스를 한 곳에서 검색',
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q?.trim() || ''
  const scope = params.scope || 'all'
  const sortBy = params.sortBy || 'publishedAt'
  const page = parseInt(params.page || '1', 10)

  const limit = 24

  const [domesticResult, aiItResult] = await Promise.all([
    scope === 'ai-it'
      ? Promise.resolve({ articles: [] as ArticleWithSource[], total: 0, totalPages: 0 })
      : getArticles({
          search: query || undefined,
          category: scope === 'domestic' ? 'domestic' : undefined,
          page,
          limit,
          sortBy,
        }),
    scope === 'domestic'
      ? Promise.resolve({ articles: [], total: 0, totalPages: 0 })
      : searchAIITNews({
          query: query || undefined,
          page,
          limit,
          sortBy: (sortBy as 'publishedAt' | 'relevance') || 'publishedAt',
        }),
  ])

  const domesticArticles = domesticResult.articles
  const aiItArticles = aiItResult.articles

  const totalResults = domesticResult.total + aiItResult.total
  const hasQuery = query.length > 0

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">뉴스 검색</h1>
        <SearchBar initialQuery={query} initialScope={scope} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
        {Object.entries(SCOPE_LABELS).map(([value, label]) => (
          <a
            key={value}
            href={`/search${query ? `?q=${encodeURIComponent(query)}&scope=${value}` : `?scope=${value}`}`}
            aria-current={scope === value ? 'page' : undefined}
            className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">🔍</div>
          <p className="text-lg font-medium text-foreground">검색어를 입력해 보세요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            국내 경제 뉴스와 AI·IT 뉴스를 통합 검색할 수 있습니다.
          </p>
        </div>
      ) : totalResults === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">🗞️</div>
          <p className="text-lg font-medium text-foreground">
            &ldquo;{query}&rdquo; 에 대한 검색 결과가 없습니다
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            다른 키워드나 범위(전체/국내/AI·IT)로 다시 시도해 보세요.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            &ldquo;{query}&rdquo; 검색 결과 <span className="font-semibold text-foreground">{totalResults.toLocaleString()}</span>건
            {scope !== 'all' && ` · ${SCOPE_LABELS[scope]}`}
          </p>

          {domesticArticles.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                국내 경제 <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{domesticResult.total}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {domesticArticles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}

          {aiItArticles.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                AI·IT <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{aiItResult.total}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {aiItArticles.map((article) => (
                  <NewsCard key={article.id} article={article as unknown as ArticleWithSource} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
