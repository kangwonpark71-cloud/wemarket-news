import NewsList from '@/components/news/NewsList'
import { FinancialDashboard } from '@/components/financial/FinancialDashboard'
import WeatherWidget from '@/components/layout/WeatherWidget'
import { getArticles } from '@/lib/rss/db-service'
import { NewsletterWidget } from '@/components/ui/NewsletterWidget'
import { BannerDisplay } from '@/components/ui/BannerDisplay'
import { SidebarAds } from '@/components/ui/SidebarAds'

interface DomesticPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function DomesticPage({ searchParams }: DomesticPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const { articles, total, totalPages } = await getArticles({
    category: 'domestic',
    page,
    limit: 20,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-foreground">국내 경제</h1>
          <span className="text-xs px-2 py-0.5 rounded-sm bg-primary text-primary-foreground">
            실시간 금융 데이터
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          한국경제, 매일경제의 최신 경제 뉴스
        </p>
      </div>

      <section aria-label="날씨" className="mb-6">
        <WeatherWidget />
      </section>

      <section aria-label="뉴스 기사" className="space-y-4">
        <NewsList articles={articles} emptyMessage="아직 수집된 뉴스가 없습니다" />

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
            {page > 1 && (
              <a
                href={`/domestic?page=${page - 1}`}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                이전
              </a>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground" aria-current="page">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/domestic?page=${page + 1}`}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                다음
              </a>
            )}
          </nav>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          총 {total}건의 뉴스
        </div>

        <NewsletterWidget />
      </section>

      <section aria-label="금융 대시보드" className="mt-8">
        <FinancialDashboard />
      </section>

      <section aria-label="광고 및 배너" className="mt-8 space-y-6">
        <SidebarAds />
        <BannerDisplay position="top" />
        <BannerDisplay position="bottom" />
      </section>
    </div>
  )
}
