'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NAV_ITEMS, type NavItem } from '@/lib/constants/nav'
import { MobileNav } from '@/components/layout/MobileNav'

interface CurrentUser {
  name?: string
}

export default function Header() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '')
  const [lastCrawled, setLastCrawled] = useState<string>('')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!navRef.current) return
    const activeLink = navRef.current.querySelector('[aria-current="page"]')
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [pathname])

  useEffect(() => {
    async function checkUser() {
      const hasSession = document.cookie.includes('session=')
      if (!hasSession) return
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
      setLastCrawled(`${dateStr} · 반영: ${timeStr}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isSubItemActive = (item: NavItem): boolean => {
    if (isActive(item.href)) return true
    if (item.children) return item.children.some((child) => isActive(child.href))
    return false
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    window.location.href = `/search${query ? `?${params.toString()}` : ''}`
  }

  return (
    <header className="sticky top-0 z-[80] w-full border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="메뉴 열기"
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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

        </div>
      </div>

      <div className="border-t border-border hidden md:block bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav ref={navRef} className="flex h-11 items-center gap-1 overflow-x-auto scrollbar-none py-1" aria-label="주요 내비게이션">
            {NAV_ITEMS.map((item) => {
              const active = item.children ? isSubItemActive(item) : isActive(item.href)
              const hasChildren = !!item.children && item.children.length > 0

              if (!hasChildren) {
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
                    {item.href === '/' && (
                      <span className="ml-1.5 inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        광고없는 뉴스
                      </span>
                    )}
                  </Link>
                )
              }

              return (
                <div key={item.href} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === item.href ? null : item.href)}
                    onMouseEnter={() => setOpenDropdown(item.href)}
                    className={cn(
                      'whitespace-nowrap px-4 py-1.5 text-xs font-semibold tracking-tight transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center gap-1',
                      active
                        ? 'border-primary text-primary font-bold bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    aria-expanded={openDropdown === item.href}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openDropdown === item.href && (
                    <div
                      className="absolute left-0 top-full z-50 mt-0 min-w-[160px] rounded-sm border border-border bg-background shadow-lg py-1"
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      {item.children!.map((child) => {
                        const childActive = isActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors',
                              childActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                            aria-current={childActive ? 'page' : undefined}
                          >
                            {child.icon && <span aria-hidden="true">{child.icon}</span>}
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
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

      <MobileNav open={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </header>
  )
}
