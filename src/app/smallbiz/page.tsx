import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import { SUBCATEGORY_LABELS, getSourcesByCategory } from '@/lib/rss/sources'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '소상공인 뉴스 - 정부 지원사업, 외식·카페, 창업 정보',
  description:
    '한국소상공인신문, 식품외식경제 등 소상공인 전문 매체의 최신 뉴스를 확인하세요. 지원사업, 외식·카페, 창업·경영 정보.',
}

interface SmallBizPageProps {
  searchParams: Promise<{ subcategory?: string; page?: string }>
}

export default async function SmallBizPage({ searchParams }: SmallBizPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const subcategory = params.subcategory

  const { articles, total, totalPages } = await getArticles({
    category: 'smallbiz',
    subcategory,
    page,
    limit: 20,
  })

  const subcategories = [...new Set(getSourcesByCategory('smallbiz').map((s) => s.subcategory))]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">소상공인 뉴스</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          소상공인을 위한 맞춤 뉴스 — 지원사업, 외식·카페, 창업·경영 정보
          {subcategory && (
            <span className="ml-2 inline-flex rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
              {SUBCATEGORY_LABELS[subcategory] || subcategory}
            </span>
          )}
        </p>
      </div>

      {/* Subcategory filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="소상공인 뉴스 카테고리">
        <Link
          href="/smallbiz"
          role="tab"
          aria-selected={!subcategory}
          className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition-colors ${
            !subcategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          전체
        </Link>
        {subcategories.map((sc) => (
          <Link
            key={sc}
            href={`/smallbiz?subcategory=${sc}`}
            role="tab"
            aria-selected={subcategory === sc}
            className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition-colors ${
              subcategory === sc
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {SUBCATEGORY_LABELS[sc] || sc}
          </Link>
        ))}
      </div>

      <section aria-label="소상공인 뉴스 기사" className="space-y-4">
        <NewsList articles={articles} emptyMessage="아직 수집된 소상공인 뉴스가 없습니다" />

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
            {page > 1 && (
              <Link
                href={`/smallbiz?page=${page - 1}${subcategory ? `&subcategory=${subcategory}` : ''}`}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                이전
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground" aria-current="page">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/smallbiz?page=${page + 1}${subcategory ? `&subcategory=${subcategory}` : ''}`}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                다음
              </Link>
            )}
          </nav>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          총 {total}건의 뉴스
        </div>
      </section>
    </div>
  )
}
