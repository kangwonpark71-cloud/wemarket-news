import Sidebar from '@/components/layout/Sidebar'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'

interface OverseasPageProps {
  searchParams: Promise<{ source?: string; page?: string; search?: string }>
}

export default async function OverseasPage({ searchParams }: OverseasPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const source = params.source
  const search = params.search

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    sourceName: source,
    language: 'en',
    page,
    limit: 20,
    search,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-8">
        <Sidebar category="overseas" />

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">해외 경제</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              연준(Fed) 발표, 연설, 경제 지표 등
              {source && (
                <span className="ml-2 inline-flex rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                  필터 적용 중
                </span>
              )}
              {search && (
                <span className="ml-2 inline-flex rounded-sm bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
                  검색: {search}
                </span>
              )}
            </p>
          </div>

          <NewsList articles={articles} emptyMessage="아직 수집된 뉴스가 없습니다" />

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
              {page > 1 && (
                <a
                  href={`/overseas?page=${page - 1}${source ? `&source=${source}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="rounded-none border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  이전
                </a>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground" aria-current="page">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/overseas?page=${page + 1}${source ? `&source=${source}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                  className="rounded-none border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  다음
                </a>
              )}
            </nav>
          )}

          <div className="mt-4 text-center text-xs text-muted-foreground">
            총 {total}건의 뉴스
          </div>
        </div>
      </div>
    </div>
  )
}