import { Metadata } from 'next'
import { searchNaverNewsByDate } from '@/lib/services/search/naver-news-service'
import NaverNewsList from '@/components/news/NaverNewsList'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'

export const metadata: Metadata = {
  title: '사회 뉴스 - 실시간 사회',
  description: '네이버 뉴스 실시간 사회 뉴스를 확인하세요.',
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function SocietyPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const start = (page - 1) * 20 + 1

  const { articles, total } = await searchNaverNewsByDate('사회', {
    display: 20,
    start,
  })

  const totalPages = Math.ceil(total / 20)

  return (
    <CategoryPageLayout
      title="사회 실시간 뉴스"
      description="네이버 뉴스 실시간 사회"
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/society"
    >
      <NaverNewsList articles={articles} />
    </CategoryPageLayout>
  )
}
