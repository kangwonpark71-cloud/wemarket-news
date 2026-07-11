import Sidebar from '@/components/layout/Sidebar'
import NewsList from '@/components/news/NewsList'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import RefreshButton from '@/components/ui/RefreshButton'
import Link from 'next/link'
import { getArticles } from '@/lib/rss/db-service'

interface HomePageProps {
  searchParams: Promise<{ source?: string; page?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const source = params.source

  const { articles, total, totalPages } = await getArticles({
    category: 'domestic',
    sourceName: source,
    page,
    limit: 20,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">국내 경제</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white">
                실시간 금융 데이터
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              한국경제, 매일경제의 최신 경제 뉴스
              {source && (
                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  필터 적용 중
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/all"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              전체 뉴스 보기
            </Link>
            <Link
              href="/stocks"
              className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              주식 시장
            </Link>
            <Link
              href="/crypto"
              className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              암호화폐
            </Link>
            <Link
              href="/forex"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              환율
            </Link>
            <Link
              href="/global"
              className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
            >
              글로벌 시장
            </Link>
          </div>
        </div>
      </div>

      <FinancialDashboard />

      <div className="flex gap-8 mt-8">
        <Sidebar category="domestic" />

        <div className="min-w-0 flex-1">
          <NewsList articles={articles} emptyMessage="아직 수집된 뉴스가 없습니다" />

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
              {page > 1 && (
                <Link
                  href={`/?page=${page - 1}${source ? `&source=${source}` : ''}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  이전
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-gray-500" aria-current="page">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/?page=${page + 1}${source ? `&source=${source}` : ''}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  다음
                </Link>
              )}
            </nav>
          )}

          <div className="mt-4 text-center text-xs text-gray-400">
            총 {total}건의 뉴스
          </div>
        </div>
      </div>
    </div>
  )
}