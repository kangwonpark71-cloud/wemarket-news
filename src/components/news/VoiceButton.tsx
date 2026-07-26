'use client'

import { useCallback } from 'react'
import { useTTS } from '@/lib/tts/use-tts'

interface VoiceButtonProps {
  articleId: string
  title: string
  description?: string | null
  content?: string | null
  language: string
}

export default function VoiceButton({ articleId, title, description, content, language }: VoiceButtonProps) {
  const tts = useTTS()
  const isOwn = tts.activeId === articleId
  const isActive = isOwn && tts.speaking
  const isLoading = isOwn && tts.loading
  const isPaused = isOwn && tts.paused

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isActive) {
      tts.stop()
      return
    }

    if (isPaused) {
      tts.resume()
      return
    }

    const text = content
      ? [title.trim(), content.trim()].filter(Boolean).join('. ')
      : [title.trim(), description?.trim()].filter(Boolean).join('. ')
    tts.speak(articleId, text, language === 'ko' ? 'ko-KR' : 'en-US')
  }, [articleId, title, description, content, language, tts, isActive, isPaused])

  if (!tts.supported) return null

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`relative inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 ${
        isActive
          ? 'bg-primary text-white shadow-sm shadow-primary/30'
          : isLoading
            ? 'text-muted-foreground/50 cursor-wait'
            : 'text-muted-foreground hover:bg-accent-light hover:text-accent'
      }`}
      title={
        isLoading ? '음성 생성 중...'
        : isActive ? '읽기 중지'
        : isPaused ? '계속 듣기'
        : content ? '전체 기사 듣기'
        : '뉴스 듣기'
      }
      aria-label={
        isLoading ? '음성 생성 중...'
        : isActive ? '읽기 중지'
        : isPaused ? '계속 듣기'
        : '뉴스 듣기'
      }
    >
      {isLoading ? (
        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : isActive ? (
        <span className="flex items-center gap-[2px]">
          <span className="h-3 w-[2px] animate-tts-wave-1 rounded-full bg-current" />
          <span className="h-2 w-[2px] animate-tts-wave-2 rounded-full bg-current" />
          <span className="h-3 w-[2px] animate-tts-wave-3 rounded-full bg-current" />
          <span className="h-2 w-[2px] animate-tts-wave-4 rounded-full bg-current" />
          <span className="h-3 w-[2px] animate-tts-wave-5 rounded-full bg-current" />
        </span>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  )
}
