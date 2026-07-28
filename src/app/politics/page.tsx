import { Metadata } from 'next'
import { searchNaverNewsByDate } from '@/lib/services/search/naver-news-service'
import NaverNewsList from '@/components/news/NaverNewsList'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '정치 뉴스 - 실시간 정치',
  description: '정치 뉴스를 확인하세요.',
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function PoliticsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const start = (page - 1) * 20 + 1

  const naverResult = await searchNaverNewsByDate('정치', {
    display: 20,
    start,
  })

  if (naverResult.total > 0) {
    const totalPages = Math.ceil(naverResult.total / 20)
    return (
      <CategoryPageLayout
        title="정치 실시간 뉴스"
        description="네이버 뉴스 실시간 정치"
        total={naverResult.total}
        page={page}
        totalPages={totalPages}
        basePath="/politics"
      >
        <NaverNewsList articles={naverResult.articles} />
      </CategoryPageLayout>
    )
  }

  const rssResult = await getArticles({
    subcategory: 'politics',
    page,
    limit: 20,
  })

  return (
    <CategoryPageLayout
      title="정치 실시간 뉴스"
      description="연합뉴스TV, YTN 정치 뉴스"
      total={rssResult.total}
      page={page}
      totalPages={rssResult.totalPages}
      basePath="/politics"
    >
      <NewsList articles={rssResult.articles} emptyMessage="아직 수집된 정치 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
