'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

export default function Sidebar({ category }: SidebarProps) {
  const pathname = usePathname()

  const items = category === 'domestic' ? DOMESTIC_ITEMS : category === 'overseas' ? OVERSEAS_ITEMS : []

  if (category === 'all') {
    return (
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 space-y-6">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              빠른 필터
            </h3>
            <nav className="space-y-1">
              <Link
                href="/all"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/all' && !pathname.includes('?')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <span>📋</span>
                <span>전체 뉴스</span>
              </Link>
              <Link
                href="/all?language=ko"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>🇰🇷</span>
                <span>국내 뉴스만</span>
              </Link>
              <Link
                href="/all?language=en"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span>🇺🇸</span>
                <span>해외 뉴스만</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-20 space-y-6">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {category === 'domestic' ? '국내 경제 소스' : '해외 경제 소스'}
          </h3>
          <nav className="space-y-1">
            {items.map((item) => {
              const isCurrentPage = pathname + item.href === item.href || pathname === item.href.split('?')[0]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isCurrentPage
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-2 text-sm font-medium text-gray-900">마지막 업데이트</h4>
          <p className="text-xs text-gray-500">3시간마다 자동 갱신됩니다</p>
        </div>
      </div>
    </aside>
  )
}
