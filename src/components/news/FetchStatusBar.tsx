'use client'

import { useEffect, useState, useCallback } from 'react'

interface FetchProgress {
  phase: 'start' | 'progress'
  system: 'rss' | 'aiit'
  source?: string
  status?: string
  error?: string
  newArticles?: number
  totalArticles?: number
  total: number
  completed: number
  current: number
}

interface FetchComplete {
  system: 'rss' | 'aiit'
  total: number
  success: number
  errors: number
}

type FetchEvent = FetchProgress | FetchComplete

export function FetchStatusBar() {
  const [current, setCurrent] = useState<FetchProgress | null>(null)
  const [complete, setComplete] = useState<FetchComplete | null>(null)
  const [connected, setConnected] = useState(false)

  const handleEvent = useCallback((data: FetchEvent) => {
    if ('phase' in data && data.phase === 'start') {
      setComplete(null)
      setCurrent(data)
    } else if ('phase' in data && data.phase === 'progress') {
      setCurrent(data)
    } else if ('total' in data && 'success' in data) {
      setComplete(data)
      setCurrent(null)
      setTimeout(() => setComplete(null), 8000)
    }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource('/api/fetch-stream')

    eventSource.addEventListener('connected', () => setConnected(true))
    eventSource.addEventListener('progress', (e) => {
      try { handleEvent(JSON.parse(e.data)) } catch {}
    })
    eventSource.addEventListener('complete', (e) => {
      try { handleEvent(JSON.parse(e.data)) } catch {}
    })
    eventSource.onerror = () => setConnected(false)

    return () => eventSource.close()
  }, [handleEvent])

  if (!connected && !current && !complete) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {current && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-blue-800">
              {current.system === 'rss' ? 'RSS' : 'AI/IT'} 수집 중...
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-blue-600">
              <span>{current.source || '준비 중'}</span>
              <span>{current.current}/{current.total}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(current.current / current.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {complete && (
        <div className={`rounded-lg border px-4 py-3 shadow-lg ${
          complete.errors > 0
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {complete.system === 'rss' ? 'RSS' : 'AI/IT'} 수집 완료
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {complete.success}개 성공, {complete.errors}개 실패
          </p>
        </div>
      )}
    </div>
  )
}
