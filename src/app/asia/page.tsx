import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '아시아 경제 뉴스 - 일본, 중국, 아시아 증시',
  description: '일본, 중국 등 아시아 주요국의 경제 뉴스와 증시 정보를 확인하세요.',
}

interface AsiaPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AsiaPage({ searchParams }: AsiaPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    subcategory: 'asia_news',
    page,
    limit: 20,
  })

  return (
    <CategoryPageLayout
      title="아시아 경제"
      description="일본, 중국 등 아시아 주요국 경제 뉴스"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/asia"
    >
      <NewsList articles={articles} emptyMessage="아직 수집된 아시아 경제 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
