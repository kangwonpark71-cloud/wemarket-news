import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles, ArticleWithSource } from '@/lib/rss/db-service'
import { SUBCATEGORY_LABELS, getSourcesByCategory } from '@/lib/rss/sources'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '소상공인 뉴스 - 정부 지원사업, 외식·카페, 창업 정보',
  description: '한국소상공인신문, 식품외식경제 등 소상공인 전문 매체의 최신 뉴스를 확인하세요. 지원사업, 외식·카페, 창업·경영 정보.',
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
  const subcategoryTabs = [
    { key: 'all', label: '전체', href: '/smallbiz', isActive: !subcategory },
    ...subcategories.map((sc) => ({
      key: sc,
      label: SUBCATEGORY_LABELS[sc] || sc,
      href: `/smallbiz?subcategory=${sc}`,
      isActive: subcategory === sc,
    })),
  ]

  return (
    <CategoryPageLayout
      title="소상공인 뉴스"
      description={
        <>
          소상공인을 위한 맞춤 뉴스 — 지원사업, 외식·카페, 창업·경영 정보
          {subcategory && (
            <span className="ml-2 inline-flex rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
              {SUBCATEGORY_LABELS[subcategory] || subcategory}
            </span>
          )}
        </>
      }
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/smallbiz"
      subcategoryTabs={subcategoryTabs}
      extraSearchParams={{ subcategory }}
    >
      <NewsList articles={articles as ArticleWithSource[]} emptyMessage="아직 수집된 소상공인 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
