import { searchNaverNewsByDate } from '@/lib/services/search/naver-news-service'
import NaverNewsList from '@/components/news/NaverNewsList'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function PoliticsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const start = (page - 1) * 20 + 1

  const { articles, total } = await searchNaverNewsByDate('정치', {
    display: 20,
    start,
  })

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">정치 실시간 뉴스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          네이버 뉴스 실시간 정치
        </p>
      </div>

      <NaverNewsList articles={articles} emptyMessage="실시간 뉴스가 없습니다" />

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
          {page > 1 && (
            <a
              href={`/politics?page=${page - 1}`}
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
              href={`/politics?page=${page + 1}`}
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
  )
}
