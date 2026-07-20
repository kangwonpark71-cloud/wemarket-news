'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface CurrentUser {
  name?: string
}

const NAV_ITEMS = [
  { href: '/all', label: '전체뉴스', category: 'all' },
  { href: '/', label: '국내뉴스', category: 'domestic' },
  { href: '/overseas', label: '해외뉴스', category: 'overseas' },
  { href: '/ai-news', label: 'AI뉴스', category: 'ai' },
  { href: '/it-news', label: 'IT뉴스', category: 'it' },
  { href: '/stocks', label: '주식', category: 'stocks' },
  { href: '/crypto', label: '암호화폐', category: 'crypto' },
  { href: '/forex', label: '환율', category: 'forex' },
  { href: '/global', label: '글로벌', category: 'global' },
]

export default function Header() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [lastCrawled, setLastCrawled] = useState<string>('')
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const json = await res.json()
          if (json.success) setUser(json.data)
        }
      } catch {}
    }
    checkUser()
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
      const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      setLastCrawled(`${dateStr} · 크롤링: ${timeStr}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    } else {
      params.delete('search')
    }
    window.location.href = `${pathname}?${params.toString()}`
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap shrink-0" aria-label="위마켓_뉴스 홈">
            <span className="text-2xl" aria-hidden="true">📰</span>
            <span className="text-xl font-bold text-foreground">위마켓_뉴스</span>
          </Link>
          {lastCrawled && (
            <span className="text-xs text-muted-foreground hidden lg:inline whitespace-nowrap border-l border-border pl-4">
              {lastCrawled}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2" role="search">
            <label htmlFor="header-search" className="sr-only">
              뉴스 검색
            </label>
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hidden p-2 rounded-sm text-muted-foreground hover:bg-muted md:flex"
              aria-label={isSearchOpen ? '검색 닫기' : '검색 열기'}
              aria-expanded={isSearchOpen}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <div
              className={cn(
                'relative',
                isSearchOpen ? 'block' : 'hidden md:block'
              )}
            >
              <input
                id="header-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="기사 제목, 내용 검색..."
                className="h-10 w-48 lg:w-64 rounded-sm border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                aria-label="뉴스 검색"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="검색어 지우기"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {isSearchOpen && (
              <button
                type="submit"
                className="hidden md:flex h-10 px-4 items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                검색
              </button>
            )}
          </form>

          <ThemeToggle />

          {user ? (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-muted/20 hover:bg-muted text-xs font-semibold text-foreground rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">{user.name || '설정'}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border bg-muted/20 hover:bg-muted text-xs font-semibold text-foreground rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>👤</span>
              <span>로그인</span>
            </Link>
          )}

          <div className="hidden gap-2 sm:flex" aria-hidden="true">
            <span className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-sm bg-muted/40">
              3시간 자동 갱신
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border hidden md:block bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex h-11 items-center gap-1 overflow-x-auto scrollbar-none py-1" aria-label="주요 내비게이션">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'whitespace-nowrap px-4 py-1.5 text-xs font-semibold tracking-tight transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    active
                      ? 'border-primary text-primary font-bold bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto flex items-center gap-2 overflow-x-auto border-t border-border px-4 py-1 md:hidden" role="navigation" aria-label="모바일 내비게이션">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-sm px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive(item.href)
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {isSearchOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <label htmlFor="mobile-search" className="sr-only">
              뉴스 검색
            </label>
            <input
              id="mobile-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="기사 제목, 내용 검색..."
              className="flex-1 h-10 rounded-sm border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
            <button
              type="submit"
              className="h-10 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              검색
            </button>
          </form>
        </div>
      )}
    </header>
  )
}