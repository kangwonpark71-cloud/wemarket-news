'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createLogger } from '@/lib/logger'

const log = createLogger('ReadingReminder')

interface ReadingReminderConfig {
  enabled: boolean
  reminderMinutes: number
}

const DEFAULT_CONFIG: ReadingReminderConfig = {
  enabled: true,
  reminderMinutes: 3,
}

function loadConfig(): ReadingReminderConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  try {
    const stored = localStorage.getItem('reading-reminder-config')
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG
}

function saveConfig(config: ReadingReminderConfig) {
  try {
    localStorage.setItem('reading-reminder-config', JSON.stringify(config))
  } catch {
    // ignore storage errors
  }
}

interface ReadingReminderProps {
  articleId?: string
  articleTitle?: string
  onReminder?: () => void
}

export function ReadingReminder({ articleId, articleTitle, onReminder }: ReadingReminderProps) {
  const [config, setConfig] = useState<ReadingReminderConfig>(loadConfig)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsRunning(false)
    setRemainingSeconds(0)
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    startTimeRef.current = Date.now()
    const totalSeconds = config.reminderMinutes * 60
    setRemainingSeconds(totalSeconds)
    setIsRunning(true)
    log.info('Reading reminder started', { articleId, reminderMinutes: config.reminderMinutes })

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const left = totalSeconds - elapsed
      if (left <= 0) {
        clearTimer()
        // Trigger browser notification if permitted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('🕐 시간 체크!', {
            body: articleTitle ?? '오랜만에 읽고 계신 기사가 있어요',
            tag: `reading-reminder-${articleId}`,
          })
        }
        onReminder?.()
        log.info('Reading reminder triggered', { articleId })
        setRemainingSeconds(0)
      } else {
        setRemainingSeconds(left)
      }
    }, 1000)
  }, [config, articleId, articleTitle, onReminder, clearTimer])

  const toggleConfig = useCallback(() => {
    setConfig((prev) => {
      const next = { ...prev, enabled: !prev.enabled }
      saveConfig(next)
      return next
    })
  }, [])

  const changeInterval = useCallback((minutes: number) => {
    setConfig((prev) => {
      const next = { ...prev, reminderMinutes: minutes }
      saveConfig(next)
      return next
    })
  }, [])

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  if (!config.enabled) return null

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const totalTotal = config.reminderMinutes * 60
  const progress = totalTotal > 0 ? ((totalTotal - remainingSeconds) / totalTotal) * 100 : 0

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-sm text-gray-500">
        <span>📖 읽기 리마인더</span>
        <button
          type="button"
          onClick={startTimer}
          className="rounded bg-blue-100 px-3 py-1 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          타이머 시작 ({config.reminderMinutes}분)
        </button>
        <div className="flex gap-1">
          {[1, 3, 5, 10].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeInterval(m)}
              className={`rounded px-2 py-0.5 text-xs ${config.reminderMinutes === m ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {m}분
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleConfig}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          끌기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-blue-600 font-medium">🕐 읽는 중...</span>
        <span className="font-mono">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="w-full max-w-xs rounded-full bg-gray-200 h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button
        type="button"
        onClick={clearTimer}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        중단
      </button>
    </div>
  )
}
