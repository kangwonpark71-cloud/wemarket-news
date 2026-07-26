import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '경제 뉴스 - 한국경제, 매일경제 최신 경제 소식',
  description: '한국경제, 매일경제 등 국내 경제 매체의 최신 뉴스를 확인하세요.',
}

interface EconomyPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function EconomyPage({ searchParams }: EconomyPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const { articles, total, totalPages } = await getArticles({
    category: 'domestic',
    page,
    limit: 20,
  })

  return (
    <CategoryPageLayout
      title="경제"
      description="한국경제, 매일경제 최신 경제 뉴스"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/economy"
    >
      <NewsList articles={articles} emptyMessage="아직 수집된 경제 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
