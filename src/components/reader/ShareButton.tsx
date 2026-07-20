'use client'

import { useCallback, useState } from 'react'

interface ShareButtonProps {
  url: string
  title: string
  text?: string
  language?: 'ko' | 'en'
  className?: string
}

type ShareNetwork = 'x' | 'facebook' | 'line'

const SHARE_TARGETS: Record<ShareNetwork, (url: string, title: string) => string> = {
  x: (url, title) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  line: (url, title) =>
    `https://social-plugins.line.me/line/msg/text/?${encodeURIComponent(`${title} ${url}`)}`,
}

export function ShareButton({
  url,
  title,
  text,
  language = 'ko',
  className = '',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [menuId] = useState(() => `share-menu-${Math.random().toString(36).slice(2, 9)}`)

  const labels = {
    share: language === 'ko' ? '공유하기' : 'Share',
    copy: language === 'ko' ? '링크 복사' : 'Copy link',
    copied: language === 'ko' ? '복사됨' : 'Copied',
    native: language === 'ko' ? '다른 앱으로 공유' : 'Share via…',
    x: 'X',
    facebook: 'Facebook',
    line: 'LINE',
  }

  const absoluteUrl = useAbsoluteUrl(url)

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [absoluteUrl])

  const nativeShare = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text ?? title, url: absoluteUrl })
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      setOpen((v) => !v)
    }
  }, [absoluteUrl, title, text])

  const openNetwork = useCallback(
    (network: ShareNetwork) => {
      const target = SHARE_TARGETS[network](absoluteUrl, title)
      window.open(target, '_blank', 'noopener,noreferrer,width=600,height=540')
      setOpen(false)
    },
    [absoluteUrl, title],
  )

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={nativeShare}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {labels.share}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-sm border border-border bg-card shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
            >
              {copied ? labels.copied : labels.copy}
            </button>
            {(['x', 'facebook', 'line'] as ShareNetwork[]).map((network) => (
              <button
                key={network}
                type="button"
                role="menuitem"
                onClick={() => openNetwork(network)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
              >
                {labels[network]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function useAbsoluteUrl(url: string): string {
  const [absolute, setAbsolute] = useState(url)
  useState(() => {
    if (typeof window !== 'undefined' && url.startsWith('/')) {
      setAbsolute(`${window.location.origin}${url}`)
    }
  })
  return absolute
}
