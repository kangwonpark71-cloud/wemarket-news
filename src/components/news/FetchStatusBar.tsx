'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

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
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const connectRef = useRef<() => void>(() => {})
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000

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

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const eventSource = new EventSource('/api/fetch-stream')
    eventSourceRef.current = eventSource

    eventSource.addEventListener('connected', () => {
      setConnected(true)
      setReconnecting(false)
      attemptsRef.current = 0
      setReconnectAttempts(0)
    })

    eventSource.addEventListener('progress', (e) => {
      try {
        handleEvent(JSON.parse(e.data) as FetchEvent)
      } catch {
        /* ignore malformed payloads */
      }
    })

    eventSource.addEventListener('complete', (e) => {
      try {
        handleEvent(JSON.parse(e.data) as FetchEvent)
      } catch {
        /* ignore malformed payloads */
      }
    })

    eventSource.addEventListener('heartbeat', () => {
      setConnected((c) => (c ? c : true))
    })

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
      eventSourceRef.current = null

      if (attemptsRef.current < maxReconnectAttempts) {
        setReconnecting(true)
        const delay = Math.min(
          baseReconnectDelay * Math.pow(2, attemptsRef.current),
          30000,
        )
        reconnectTimeoutRef.current = setTimeout(() => {
          attemptsRef.current += 1
          setReconnectAttempts(attemptsRef.current)
          connectRef.current()
        }, delay)
      }
    }
  }, [handleEvent])

  useEffect(() => {
    connectRef.current = connect
    connect()

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [connect])

  if (!connected && !current && !complete && !reconnecting) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {reconnecting && (
        <div className="mb-2 rounded-sm border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            <span>수집 상태 reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})</span>
          </div>
        </div>
      )}

      {current && (
        <div className="rounded-sm border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg">
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
                style={{ width: `${((current.current || 0) / (current.total || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {complete && (
        <div
          className={`rounded-sm border px-4 py-3 shadow-lg ${
            complete.errors > 0
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-green-200 bg-green-50'
          }`}
        >
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
