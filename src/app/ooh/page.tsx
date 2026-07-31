import type { Metadata } from 'next'
import NewsList from '@/components/news/NewsList'
import CategoryPageLayout from '@/components/news/CategoryPageLayout'
import PopularArticles from '@/components/news/PopularArticles'
import { NewsletterWidget } from '@/components/ui/NewsletterWidget'
import { BannerDisplay } from '@/components/ui/BannerDisplay'
import { SidebarAds } from '@/components/ui/SidebarAds'
import { getArticles } from '@/lib/rss/db-service'
import { SUBCATEGORY_LABELS } from '@/lib/rss/sources'

export const metadata: Metadata = {
  title: '옥외광고 뉴스 - 매체사·대행사·기획사·광고주',
  description: '옥외광고 업계 뉴스: 전광판, 디지털사이니지, 광고 수주·캠페인, 신제품 마케팅',
}

interface OohPageProps {
  searchParams: Promise<{ page?: string; sub?: string }>
}

const OOH_SUBCATEGORIES = ['ooh_media', 'ooh_agency', 'ooh_planner', 'ooh_advertiser'] as const

export default async function OohPage({ searchParams }: OohPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const sub = params.sub || 'all'

  const tabs = [
    { key: 'all', label: '전체', href: '/ooh', isActive: sub === 'all' },
    ...OOH_SUBCATEGORIES.map((key) => ({
      key,
      label: SUBCATEGORY_LABELS[key] ?? key,
      href: `/ooh?sub=${key}`,
      isActive: sub === key,
    })),
  ]

  let articles: Awaited<ReturnType<typeof getArticles>>['articles'] = []
  let total = 0
  let totalPages = 1

  if (sub === 'all' || (OOH_SUBCATEGORIES as readonly string[]).includes(sub)) {
    if (sub === 'all') {
      const results = await Promise.all(
        OOH_SUBCATEGORIES.map((key) => getArticles({ category: 'domestic', subcategory: key, page, limit: 5 })),
      )
      articles = results
        .flatMap((r) => r.articles)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 20)
      total = results.reduce((sum, r) => sum + r.total, 0)
    } else {
      const result = await getArticles({ category: 'domestic', subcategory: sub, page, limit: 20 })
      articles = result.articles
      total = result.total
    }
    totalPages = Math.max(1, Math.ceil(total / 20))
  }

  const activeLabel = sub === 'all' ? '전체' : (SUBCATEGORY_LABELS[sub] ?? '전체')

  return (
    <CategoryPageLayout
      title="옥외광고 뉴스"
      description={`옥외광고 업계 소식 — ${activeLabel}`}
      total={total}
      page={page}
      totalPages={totalPages}
      basePath="/ooh"
      subcategoryTabs={tabs}
      extraSearchParams={{ sub: sub === 'all' ? undefined : sub }}
      newsletterWidget={<NewsletterWidget />}
      sidebarAds={<SidebarAds />}
      banners={<BannerDisplay position="bottom" />}
      popularArticles={<PopularArticles />}
    >
      <NewsList articles={articles} emptyMessage="아직 수집된 옥외광고 뉴스가 없습니다" />
    </CategoryPageLayout>
  )
}
