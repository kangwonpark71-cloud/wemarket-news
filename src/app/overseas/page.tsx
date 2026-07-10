import Sidebar from '@/components/layout/Sidebar'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'

interface OverseasPageProps {
  searchParams: Promise<{ source?: string; page?: string }>
}

export default async function OverseasPage({ searchParams }: OverseasPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const source = params.source

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    sourceName: source,
    language: 'en',
    page,
    limit: 20,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-8">
        <Sidebar category="overseas" />

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">해외 경제</h1>
            <p className="mt-1 text-sm text-gray-500">
              연준(Fed) 발표, 연설, 경제 지표 등
              {source && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  필터 적용 중
                </span>
              )}
            </p>
          </div>

          <NewsList articles={articles} emptyMessage="아직 수집된 뉴스가 없습니다" />

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/overseas?page=${page - 1}${source ? `&source=${source}` : ''}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  이전
                </a>
              )}
              <span className="px-4 py-2 text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/overseas?page=${page + 1}${source ? `&source=${source}` : ''}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  다음
                </a>
              )}
            </div>
          )}

          <div className="mt-4 text-center text-xs text-gray-400">
            총 {total}건의 뉴스
          </div>
        </div>
      </div>
    </div>
  )
}
