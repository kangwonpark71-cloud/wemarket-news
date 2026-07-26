import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '미국 경제 뉴스 - 연준(Fed), 미국 증시, 경제 지표',
  description: '연준(Fed) 금리 결정, 통화정책, 미국 경제 지표 등 최신 미국 경제 뉴스를 확인하세요.',
}

interface AmericaPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AmericaPage({ searchParams }: AmericaPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    page,
    limit: 20,
  })

  return (
    <CategoryPageLayout
      title="미국 경제"
      description="연준(Fed) 발표, 미국 증시, 경제 지표 등"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/america"
    >
      <NewsList articles={articles} emptyMessage="아직 수집된 미국 경제 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
