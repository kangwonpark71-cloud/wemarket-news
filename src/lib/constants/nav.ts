export interface NavItem {
  href: string
  label: string
  icon?: string
  children?: NavItem[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: '전체뉴스',
    icon: '📰',
  },
  {
    href: '/breaking',
    label: '속보',
    icon: '🚨',
  },
  {
    href: '/domestic',
    label: '국내뉴스',
    icon: '🏠',
    children: [
      { href: '/medical', label: '의료', icon: '🏥' },
      { href: '/smallbiz', label: '소상공인', icon: '🏪' },
      { href: '/ai-news', label: 'AI뉴스', icon: '🤖' },
      { href: '/it-news', label: 'IT뉴스', icon: '💡' },
      { href: '/economy', label: '경제', icon: '📊' },
      { href: '/stocks', label: '국내주식', icon: '📈' },
      { href: '/global', label: '해외주식', icon: '🌍' },
      { href: '/crypto', label: '암호화폐', icon: '🪙' },
      { href: '/politics', label: '정치', icon: '🗳️' },
      { href: '/society', label: '사회', icon: '👥' },
      { href: '/culture', label: '문화', icon: '🎨' },
      { href: '/entertainment', label: '연예', icon: '⭐' },
      { href: '/sports', label: '스포츠', icon: '🏆' },
      { href: '/ooh', label: '옥외광고', icon: '🪧' },
    ],
  },
  {
    href: '/overseas',
    label: '해외뉴스',
    icon: '🌐',
    children: [
      { href: '/america', label: '미국', icon: '🇺🇸' },
      { href: '/europe', label: '유럽', icon: '🇪🇺' },
      { href: '/asia', label: '아시아', icon: '🌏' },
    ],
  },
  {
    href: '/forex',
    label: '환율',
    icon: '💱',
  },
  {
    href: '/bookmarks',
    label: '내 모음',
    icon: '🔖',
  },
  {
    href: '/search',
    label: '검색',
    icon: '🔍',
  },
]
