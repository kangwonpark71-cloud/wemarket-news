import { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import { getArticles } from '@/lib/rss/db-service'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'
import AutoTranslator from '@/components/news/AutoTranslator'

export const metadata: Metadata = {
  title: '해외 경제 뉴스 - 연준(Fed) 금리, 통화정책, 경제 지표',
  description: '연준(Fed)의 금리 결정, 통화정책 회의록, 연설 및 증언, 경제 지표 등 해외 경제 뉴스를 실시간으로 확인하세요.',
}

interface OverseasPageProps {
  searchParams: Promise<{ source?: string; page?: string; search?: string }>
}

export default async function OverseasPage({ searchParams }: OverseasPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const source = params.source
  const search = params.search

  const { articles, total, totalPages } = await getArticles({
    category: 'overseas',
    sourceName: source,
    language: 'en',
    page,
    limit: 20,
    search,
  })

  return (
    <CategoryPageLayout
      title="해외 경제"
      description={
        <>
          연준(Fed) 발표, 연설, 경제 지표 등
          {source && (
            <span className="ml-2 inline-flex rounded-sm bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
              필터 적용 중
            </span>
          )}
          {search && (
            <span className="ml-2 inline-flex rounded-sm bg-accent-light px-2 py-0.5 text-xs font-medium text-accent">
              검색: {search}
            </span>
          )}
        </>
      }
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/overseas"
      extraSearchParams={{ source, search }}
    >
      <AutoTranslator />
      <NewsList articles={articles} />
    </CategoryPageLayout>
  )
}
