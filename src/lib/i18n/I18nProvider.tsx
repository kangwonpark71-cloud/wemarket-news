'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { dictionaries, type Locale } from '@/lib/i18n/dictionaries'

const LOCALE_KEY = 'economy-news:locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
  /** Translate a key; falls back to `fallback` then to the key itself. */
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ko'
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'ko' || stored === 'en') return stored
  } catch {
    // localStorage may be unavailable in sandboxed contexts
  }
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default 'ko' on both server and first client render avoids hydration mismatch;
  // the effect flips to the persisted/OS locale right after hydration.
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    setLocaleState(getInitialLocale())
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(LOCALE_KEY, next)
      document.documentElement.lang = next
    } catch {
      // ignore storage failures
    }
  }, [])

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === 'ko' ? 'en' : 'ko'
      try {
        localStorage.setItem(LOCALE_KEY, next)
        document.documentElement.lang = next
      } catch {
        // ignore storage failures
      }
      return next
    })
  }, [])

  const t = useCallback(
    (key: string, fallback?: string) => {
      return dictionaries[locale][key] ?? fallback ?? key
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
