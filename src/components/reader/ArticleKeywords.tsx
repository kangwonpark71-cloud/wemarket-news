import React from 'react'

export const DEFAULT_KEYWORDS = [
  '삼성전자', '현대차', '엔비디아', 'NVIDIA', '애플', 'Apple', '금리', '연준', '시가총액',
  '시총', 'OpenAI', 'GPT-4', 'Claude', '인공지능', 'AI', '달러', '환율', '증시',
]

interface ArticleKeywordsProps {
  text: string
  keywords?: string[]
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightKeywords(text: string, keywords: string[] = DEFAULT_KEYWORDS): React.ReactNode {
  if (!text) return text

  const unique = Array.from(new Set(keywords)).filter(Boolean)
  if (unique.length === 0) return text

  const pattern = new RegExp(`(${unique.map(escapeRegExp).join('|')})`, 'g')
  const parts = text.split(pattern)

  return parts.map((part, i) =>
    unique.includes(part) ? (
      <mark
        key={i}
        className="rounded-sm bg-primary/10 px-0.5 font-semibold text-primary"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

export function ArticleKeywords({ text, keywords }: ArticleKeywordsProps) {
  return <>{highlightKeywords(text, keywords)}</>
}
