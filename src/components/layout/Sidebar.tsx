'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  category: 'domestic' | 'overseas' | 'all'
}

interface SidebarItem {
  label: string
  href: string
  icon: string
  count?: number
}

const DOMESTIC_ITEMS: SidebarItem[] = [
  { label: '한국 경제', href: '/?source=hankyung', icon: '🏦' },
  { label: '매일 경제', href: '/?source=mk', icon: '📊' },
]

const OVERSEAS_ITEMS: SidebarItem[] = [
  { label: 'Press Releases', href: '/overseas?source=fed_press', icon: '🏛️' },
  { label: 'Monetary Policy', href: '/overseas?source=fed_monetary', icon: '💰' },
  { label: 'Speeches & Testimony', href: '/overseas?source=fed_speeches', icon: '🎤' },
  { label: 'FEDS Notes', href: '/overseas?source=fed_notes', icon: '📝' },
  { label: 'Interest Rates', href: '/overseas?source=fed_interest_rates', icon: '📈' },
  { label: 'Exchange Rates', href: '/overseas?source=fed_exchange_rates', icon: '💱' },
]

const ALL_QUICK_FILTERS = [
  { label: '전체 뉴스', href: '/all', icon: '📋' },
  { label: '국내 뉴스만', href: '/all?language=ko', icon: '🇰🇷' },
  { label: '해외 뉴스만', href: '/all?language=en', icon: '🇺🇸' },
]

export default function Sidebar({ category }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const items = category === 'domestic' ? DOMESTIC_ITEMS : category === 'overseas' ? OVERSEAS_ITEMS : []

  if (category === 'all') {
    return (
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="전체 뉴스 필터">
        <div className="sticky top-24 space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              빠른 필터
            </h3>
            <nav className="space-y-1" aria-label="빠른 필터">
              {ALL_QUICK_FILTERS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-light text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="rounded-sm border border-border bg-muted p-4">
            <h4 className="mb-2 text-sm font-medium text-foreground">자동 업데이트</h4>
            <p className="text-xs text-muted-foreground">3시간마다 자동으로 새 기사를 수집합니다</p>
          </div>
        </div>
      </aside>
    )
  }

  const currentSource = searchParams.get('source')

  return (
    <aside className="hidden w-64 shrink-0 lg:block" aria-label={`${category === 'domestic' ? '국내' : '해외'} 경제 소스`}>
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category === 'domestic' ? '국내 경제 소스' : '해외 경제 소스'}
          </h3>
          <nav className="space-y-1" aria-label={`${category === 'domestic' ? '국내' : '해외'} 소스 목록`}>
            {items.map((item) => {
              const isCurrent = currentSource === item.href.split('=')[1]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    isCurrent
                      ? 'bg-primary-light text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="rounded-sm border border-border bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">마지막 업데이트</h4>
          <p className="text-xs text-muted-foreground">3시간마다 자동 갱신됩니다</p>
        </div>

        {category === 'domestic' && (
          <div className="rounded-sm border border-border bg-muted p-4">
            <h4 className="mb-2 text-sm font-medium text-foreground">검색 팁</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>헤더의 검색창으로 기사 검색</li>
              <li>소스별 필터링: 사이드바 메뉴 사용</li>
              <li>읽은 기사는 회색으로 표시</li>
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}