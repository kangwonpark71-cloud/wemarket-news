import { ReactNode } from 'react'

interface SubcategoryTab {
  key: string
  label: string
  href: string
  isActive: boolean
}

interface CategoryPageLayoutProps {
  /** Page title (h1) */
  title: string
  /** Description text shown below title */
  description: string | ReactNode
  /** The news list content (NewsList or NaverNewsList) */
  children: ReactNode
  /** Total article count */
  total: number
  /** Current page number */
  page: number
  /** Total pages */
  totalPages: number
  /** Base path for pagination links (e.g. '/overseas') */
  basePath: string
  /** Optional: filter badges rendered in header (language/search/etc) */
  filterBadges?: ReactNode
  /** Optional: subcategory filter tabs */
  subcategoryTabs?: SubcategoryTab[]
  /** Optional: weather widget rendered above news list */
  weatherWidget?: ReactNode
  /** Optional: financial dashboard rendered below news list */
  financialDashboard?: ReactNode
  /** Optional: newsletter widget rendered below pagination */
  newsletterWidget?: ReactNode
  /** Optional: sidebar ads rendered at bottom */
  sidebarAds?: ReactNode
  /** Optional: banner display(s) rendered at bottom */
  banners?: ReactNode
  /** Extra query params to preserve in pagination links (values can be undefined to omit) */
  extraSearchParams?: Record<string, string | undefined>
}

function buildPageUrl(
  basePath: string,
  pageNum: number,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams()
  if (pageNum > 1) params.set('page', String(pageNum))
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== '') {
        params.set(key, value)
      }
    }
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export default function CategoryPageLayout({
  title,
  description,
  children,
  total,
  page,
  totalPages,
  basePath,
  filterBadges,
  subcategoryTabs,
  weatherWidget,
  financialDashboard,
  newsletterWidget,
  sidebarAds,
  banners,
  extraSearchParams,
}: CategoryPageLayoutProps) {
  const hasArticles = total > 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
          {filterBadges}
        </p>
      </div>

      {/* Subcategory Tabs */}
      {subcategoryTabs && subcategoryTabs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label={`${title} 카테고리`}>
          {subcategoryTabs.map((tab) => (
            <a
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={tab.isActive}
              className={`rounded-sm px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab.isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      )}

      {/* Weather Widget */}
      {weatherWidget && (
        <section aria-label="날씨" className="mb-6">
          {weatherWidget}
        </section>
      )}

      {/* News List */}
      <section aria-label="뉴스 기사" className="space-y-4">
        {children}

        {/* Pagination */}
        {hasArticles && totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-2" aria-label="페이지네이션">
            {page > 1 && (
              <a
                href={buildPageUrl(basePath, page - 1, extraSearchParams)}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                이전
              </a>
            )}
            <span className="px-4 py-2 text-sm text-muted-foreground" aria-current="page">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={buildPageUrl(basePath, page + 1, extraSearchParams)}
                className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                다음
              </a>
            )}
          </nav>
        )}

        {/* Total count */}
        {hasArticles && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            총 {total}건의 뉴스
          </div>
        )}

        {/* Newsletter */}
        {newsletterWidget}
      </section>

      {/* Financial Dashboard */}
      {financialDashboard && (
        <section aria-label="금융 대시보드" className="mt-8">
          {financialDashboard}
        </section>
      )}

      {/* Ads */}
      {(sidebarAds || banners) && (
        <section aria-label="광고 및 배너" className="mt-8 space-y-6">
          {sidebarAds}
          {banners}
        </section>
      )}
    </div>
  )
}
