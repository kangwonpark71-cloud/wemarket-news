'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SearchBarProps {
  initialQuery?: string
  initialScope?: string
}

type Suggestion = string

export function SearchBar({ initialQuery = '', initialScope = 'all' }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [popular, setPopular] = useState<string[]>([])
  const [trending, setTrending] = useState<{ topic: string; count: number }[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/ai-it/search?action=popular&limit=6')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setPopular(d.popular)
      })
      .catch(() => {})
    fetch('/api/ai-it/search?action=trending&hours=24&limit=6')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setTrending(d.trending)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function fetchSuggestions(value: string) {
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    fetch(`/api/ai-it/search?action=suggest&q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSuggestions(d.suggestions)
      })
      .catch(() => setSuggestions([]))
  }

  function onChange(value: string) {
    setQuery(value)
    setActiveIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250)
    setOpen(true)
  }

  function submit(q: string, scope?: string) {
    const trimmed = q.trim()
    const params = new URLSearchParams()
    if (trimmed) params.set('q', trimmed)
    if (scope && scope !== 'all') params.set('scope', scope)
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        submit(suggestions[activeIndex], initialScope)
      } else {
        submit(query, initialScope)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const SCOPES = [
    { value: 'all', label: '전체' },
    { value: 'domestic', label: '국내' },
    { value: 'ai-it', label: 'AI·IT' },
  ]

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(query, initialScope)
        }}
        role="search"
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="search"
            role="combobox"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="뉴스 검색 (키워드, 기업, 모델명...)"
            aria-label="뉴스 검색"

            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="search-suggestions"
            className="h-11 w-full rounded-sm border border-border bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {open && suggestions.length > 0 && (
            <ul
              id="search-suggestions"
              role="listbox"
              className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-sm border border-border bg-popover shadow-lg"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    submit(s, initialScope)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm ${
                    i === activeIndex ? 'bg-muted text-foreground' : 'text-foreground'
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="truncate">{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="검색 범위">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => submit(query, s.value)}
              aria-pressed={initialScope === s.value}
              className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                initialScope === s.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </form>

      {open && !query && (popular.length > 0 || trending.length > 0) && (
        <div className="absolute z-50 mt-2 w-full rounded-sm border border-border bg-popover p-4 shadow-lg">
          {popular.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">인기 검색어</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      submit(p, initialScope)
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {trending.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">급상승 주제</p>
              <div className="flex flex-wrap gap-2">
                {trending.map((t) => (
                  <button
                    key={t.topic}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      submit(t.topic, initialScope)
                    }}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-foreground hover:bg-primary/10"
                  >
                    {t.topic} <span className="text-muted-foreground">({t.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
