export interface NavItem {
  href: string
  label: string
  icon?: string
}

// "/" is the default landing page (전체뉴스); 국내뉴스 lives at /domestic.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '전체뉴스', icon: '📰' },
  { href: '/domestic', label: '국내뉴스', icon: '🏠' },
  { href: '/overseas', label: '해외뉴스', icon: '🌐' },
  { href: '/ai-news', label: 'AI뉴스', icon: '🤖' },
  { href: '/it-news', label: 'IT뉴스', icon: '💡' },
  { href: '/stocks', label: '주식', icon: '📈' },
  { href: '/crypto', label: '암호화폐', icon: '🪙' },
  { href: '/forex', label: '환율', icon: '💱' },
  { href: '/global', label: '글로벌', icon: '🏛️' },
  { href: '/bookmarks', label: '내 모음', icon: '🔖' },
  { href: '/search', label: '검색', icon: '🔍' },
]
