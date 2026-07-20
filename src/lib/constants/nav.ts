// Shared navigation contract used by both the desktop Header and the mobile
// drawer, so the two never drift apart.

export interface NavItem {
  href: string
  label: string
  icon?: string
  category?: string
}

// Primary sections shown in the header bar and the mobile drawer.
export const NAV_ITEMS: NavItem[] = [
  { href: '/all', label: '전체뉴스', category: 'all' },
  { href: '/', label: '국내뉴스', category: 'domestic' },
  { href: '/overseas', label: '해외뉴스', category: 'overseas' },
  { href: '/ai-news', label: 'AI뉴스', category: 'ai' },
  { href: '/it-news', label: 'IT뉴스', category: 'it' },
  { href: '/stocks', label: '주식', category: 'stocks' },
  { href: '/crypto', label: '암호화폐', category: 'crypto' },
  { href: '/forex', label: '환율', category: 'forex' },
  { href: '/global', label: '글로벌', category: 'global' },
  { href: '/search', label: '검색', icon: '🔍' },
]

// Per-section source / quick-filter links that the desktop Sidebar shows.
// Mirrored into the mobile drawer so source filtering is reachable on phones.
export interface SidebarNavItem {
  label: string
  href: string
  icon: string
}

const DOMESTIC_ITEMS: SidebarNavItem[] = [
  { label: '한국 경제', href: '/?source=hankyung', icon: '🏦' },
  { label: '매일 경제', href: '/?source=mk', icon: '📊' },
]

const OVERSEAS_ITEMS: SidebarNavItem[] = [
  { label: 'Press Releases', href: '/overseas?source=fed_press', icon: '🏛️' },
  { label: 'Monetary Policy', href: '/overseas?source=fed_monetary', icon: '💰' },
  { label: 'Speeches & Testimony', href: '/overseas?source=fed_speeches', icon: '🎤' },
  { label: 'FEDS Notes', href: '/overseas?source=fed_notes', icon: '📝' },
  { label: 'Interest Rates', href: '/overseas?source=fed_interest_rates', icon: '📈' },
  { label: 'Exchange Rates', href: '/overseas?source=fed_exchange_rates', icon: '💱' },
]

const ALL_QUICK_FILTERS: SidebarNavItem[] = [
  { label: '전체 뉴스', href: '/all', icon: '📋' },
  { label: '국내 뉴스만', href: '/all?language=ko', icon: '🇰🇷' },
  { label: '해외 뉴스만', href: '/all?language=en', icon: '🇺🇸' },
]

export function getSidebarNavItems(
  category: 'domestic' | 'overseas' | 'all',
): { title: string; items: SidebarNavItem[] } {
  if (category === 'domestic') {
    return { title: '국내 경제 소스', items: DOMESTIC_ITEMS }
  }
  if (category === 'overseas') {
    return { title: '해외 경제 소스', items: OVERSEAS_ITEMS }
  }
  return { title: '빠른 필터', items: ALL_QUICK_FILTERS }
}
