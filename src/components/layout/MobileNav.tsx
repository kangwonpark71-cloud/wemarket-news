'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, getSidebarNavItems, type NavItem } from '@/lib/constants/nav'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  category?: 'domestic' | 'overseas' | 'all'
}

function resolveCategory(pathname: string): 'domestic' | 'overseas' | 'all' {
  if (pathname === '/' || pathname.startsWith('/?')) return 'domestic'
  if (pathname.startsWith('/overseas')) return 'overseas'
  if (pathname.startsWith('/all')) return 'all'
  return 'all'
}

function isActive(href: string, pathname: string): boolean {
  const base = href.split('?')[0]
  if (base === '/') return pathname === '/'
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function MobileNav({ open, onClose, category }: MobileNavProps) {
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const effectiveCategory = category ?? resolveCategory(pathname)
  const sidebar = getSidebarNavItems(effectiveCategory)

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const navItems: NavItem[] = NAV_ITEMS

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label="메뉴">
      <button
        type="button"
        aria-label="메뉴 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className="absolute left-0 top-0 flex h-full w-[80%] max-w-xs flex-col bg-background shadow-xl"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-bold text-foreground">메뉴</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="모바일 내비게이션">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary-light text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sidebar.title}
          </p>
          <ul className="space-y-1">
            {sidebar.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
