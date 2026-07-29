import { getArticles, type ArticleWithSource } from '@/lib/rss/db-service'
import NewsList from '@/components/news/NewsList'

interface BookmarksPageProps {
  searchParams: Promise<{
    tab?: string
    page?: string
  }>
}

const TABS = [
  { value: 'bookmarked', label: '북마크' },
  { value: 'read', label: '읽은 기사' },
] as const

type TabValue = (typeof TABS)[number]['value']

function isTab(value: string | undefined): value is TabValue {
  return value === 'bookmarked' || value === 'read'
}

export const metadata = {
  title: '내 뉴스 모음',
  description: '북마크한 기사와 읽은 기사를 한 곳에서 모아보기',
}

export default async function BookmarksPage({ searchParams }: BookmarksPageProps) {
  const params = await searchParams
  const tab = isTab(params.tab) ? params.tab : 'bookmarked'
  const page = parseInt(params.page || '1', 10)
  const limit = 24

  const filter = tab === 'bookmarked' ? { isBookmarked: true } : { isRead: true }

  const { articles, total, totalPages } = await getArticles({
    ...filter,
    page,
    limit,
    sortBy: 'publishedAt',
  })

  const buildHref = (targetTab: TabValue, targetPage = 1) => {
    const sp = new URLSearchParams()
    sp.set('tab', targetTab)
    if (targetPage > 1) sp.set('page', String(targetPage))
    return `/bookmarks?${sp.toString()}`
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold text-foreground">내 뉴스 모음</h1>
        <div className="flex gap-2 border-b border-border" role="tablist" aria-label="모음 종류">
          {TABS.map((t) => {
            const active = tab === t.value
            return (
              <a
                key={t.value}
                href={buildHref(t.value)}
                role="tab"
                aria-selected={active}
                className={`rounded-t-sm px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {t.label}
              </a>
            )
          })}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-border py-20 text-center">
          <span className="mb-4 text-4xl" aria-hidden="true">
            {tab === 'bookmarked' ? '🔖' : '✅'}
          </span>
          <p className="text-muted-foreground">
            {tab === 'bookmarked'
              ? '북마크한 기사가 없습니다. 기사의 북마크 아이콘을 눌러 저장해 보세요.'
              : '아직 읽은 기사가 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <NewsList
            articles={articles as ArticleWithSource[]}
            emptyMessage={tab === 'bookmarked' ? '북마크한 기사가 없습니다' : '읽은 기사가 없습니다'}
          />

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
              {page > 1 && (
                <a
                  href={buildHref(tab, page - 1)}
                  className="rounded-none border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  이전
                </a>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground" aria-current="page">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={buildHref(tab, page + 1)}
                  className="rounded-none border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  다음
                </a>
              )}
            </nav>
          )}

          <div className="mt-4 text-center text-xs text-muted-foreground">
            총 {total.toLocaleString()}건
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <span>위마켓_뉴스 3시간 알림 비서</span>
            {' · '}
            <a
              href="https://url9.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              더 보기 →
            </a>
          </div>
        </>
      )}
    </main>
  )
}
