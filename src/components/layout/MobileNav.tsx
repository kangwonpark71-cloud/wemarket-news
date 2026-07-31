'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/lib/constants/nav'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

function isActive(href: string, pathname: string): boolean {
  const base = href.split('?')[0]
  if (base === '/') return pathname === '/'
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  // Auto-expand the parent of an active sub-item on open
  useEffect(() => {
    if (!open) return
    for (const item of NAV_ITEMS) {
      if (item.children) {
        const childActive = item.children.some((child) => isActive(child.href, pathname))
        if (childActive) {
          setExpanded(item.href)
          break
        }
      }
    }
  }, [open, pathname])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true" aria-label={t('mobilenav.menu')}>
      <button
        type="button"
        aria-label={t('common.closeMenu')}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        className="absolute left-0 top-0 flex h-full w-[80%] max-w-xs flex-col bg-background shadow-xl"
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-bold text-foreground">{t('mobilenav.menu')}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-sm p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t('mobilenav.aria')}>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const hasChildren = !!item.children && item.children.length > 0
              const itemActive = hasChildren
                ? item.children!.some((child) => isActive(child.href, pathname))
                : isActive(item.href, pathname)
              const isExpanded = expanded === item.href

              return (
                <li key={item.href}>
                  {hasChildren ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : item.href)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          itemActive
                            ? 'bg-primary-light text-primary'
                            : 'text-foreground hover:bg-muted'
                        )}
                        aria-expanded={isExpanded}
                      >
                        {item.icon && <span aria-hidden="true">{item.icon}</span>}
                        <span className="flex-1 text-left">{t(`nav.${item.href}`, item.label)}</span>
                        <svg
                          className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <ul className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                          {item.children!.map((child) => {
                            const childActive = isActive(child.href, pathname)
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onClose}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={cn(
                                    'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                    childActive
                                      ? 'bg-primary-light text-primary'
                                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                  )}
                                >
                                  {child.icon && <span aria-hidden="true">{child.icon}</span>}
                                  <span>{t(`nav.${child.href}`, child.label)}</span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={itemActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        itemActive
                          ? 'bg-primary-light text-primary'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      <span>{t(`nav.${item.href}`, item.label)}</span>
                      {item.href === '/' && (
                        <span className="ml-auto inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {t('common.adfree')}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
