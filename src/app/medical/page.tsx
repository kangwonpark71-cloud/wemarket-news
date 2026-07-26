import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles, ArticleWithSource } from '@/lib/rss/db-service'
import { SUBCATEGORY_LABELS, getSourcesByCategory } from '@/lib/rss/sources'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '의료 뉴스 - 의료정책, 제약·신약, 해외 의학 연구',
  description: '의협신문, 보사, 히트뉴스, The Lancet, FDA 등 국내외 의료 전문 매체의 최신 뉴스를 확인하세요. 의료정책, 제약·신약, 해외 의학 연구 정보.',
}

interface MedicalPageProps {
  searchParams: Promise<{ subcategory?: string; page?: string }>
}

export default async function MedicalPage({ searchParams }: MedicalPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const subcategory = params.subcategory

  const { articles, total, totalPages } = await getArticles({
    category: 'medical',
    subcategory,
    page,
    limit: 20,
  })

  const subcategories = [...new Set(getSourcesByCategory('medical').map((s) => s.subcategory))]
  const subcategoryTabs = [
    { key: 'all', label: '전체', href: '/medical', isActive: !subcategory },
    ...subcategories.map((sc) => ({
      key: sc,
      label: SUBCATEGORY_LABELS[sc] || sc,
      href: `/medical?subcategory=${sc}`,
      isActive: subcategory === sc,
    })),
  ]

  return (
    <CategoryPageLayout
      title="의료 뉴스"
      description={
        <>
          의협신문, 보사, 히트뉴스, The Lancet, FDA 등 국내외 의료 전문 매체의 최신 뉴스
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
      basePath="/medical"
      subcategoryTabs={subcategoryTabs}
      extraSearchParams={{ subcategory }}
    >
      <NewsList articles={articles as ArticleWithSource[]} emptyMessage="아직 수집된 의료 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
