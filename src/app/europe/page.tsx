import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '유럽 경제 뉴스 - ECB, 유럽 증시, 경제 지표',
  description: '유럽중앙은행(ECB) 정책, 유럽 주요국 경제 지표 등 최신 유럽 경제 뉴스를 확인하세요.',
}

interface EuropePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function EuropePage({ searchParams }: EuropePageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    subcategory: 'europe_news',
    page,
    limit: 20,
  })

  return (
    <CategoryPageLayout
      title="유럽 경제"
      description="ECB 정책, 유럽 주요국 경제 지표 등"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/europe"
    >
      <NewsList articles={articles} emptyMessage="아직 수집된 유럽 경제 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
