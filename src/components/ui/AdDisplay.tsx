'use client'

import { useEffect, useRef } from 'react'

interface AdDisplayProps {
  id: string
  adType: string
  title: string
  content: string
  linkUrl: string | null
}

export function AdDisplay({ id, adType, title, content, linkUrl }: AdDisplayProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }, [id])

  const handleClick = () => {
    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  if (adType === 'image') {
    return (
      <a
        href={linkUrl || '#'}
        target={linkUrl ? '_blank' : undefined}
        rel={linkUrl ? 'noopener noreferrer' : undefined}
        onClick={handleClick}
        className="group block overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-md"
      >
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={content} alt={title} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="p-2">
          <p className="text-xs font-medium text-foreground line-clamp-2">{title}</p>
        </div>
        <div className="px-2 pb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">광고</span>
        </div>
      </a>
    )
  }

  return (
    <a
      href={linkUrl || '#'}
      target={linkUrl ? '_blank' : undefined}
      rel={linkUrl ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      className="group block rounded-sm border border-border bg-card p-3 transition-shadow hover:shadow-md"
    >
      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{content}</p>
      <span className="mt-2 block text-[10px] text-muted-foreground uppercase tracking-wider">광고</span>
    </a>
  )
}
