import { Metadata } from 'next'
import { searchNaverNewsByDate } from '@/lib/services/search/naver-news-service'
import NaverNewsList from '@/components/news/NaverNewsList'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '연예 뉴스 - 실시간 연예',
  description: '네이버 뉴스 실시간 연예 뉴스를 확인하세요.',
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function EntertainmentPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const start = (page - 1) * 20 + 1

  const { articles, total } = await searchNaverNewsByDate('연예', {
    display: 20,
    start,
  })

  const totalPages = Math.ceil(total / 20)

  return (
    <CategoryPageLayout
      title="연예 실시간 뉴스"
      description="네이버 뉴스 실시간 연예"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/entertainment"
    >
      <NaverNewsList articles={articles} />
    </CategoryPageLayout>
  )
}
