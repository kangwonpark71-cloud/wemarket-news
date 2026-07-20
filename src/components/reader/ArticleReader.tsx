import type { ReactNode } from 'react'
import type { ReaderLanguage } from './types'

interface ArticleReaderProps {
  children: ReactNode
  language: ReaderLanguage
  className?: string
}

export function ArticleReader({ children, language, className = '' }: ArticleReaderProps) {
  return (
    <main className="min-h-screen bg-background">
      <article
        lang={language}
        className={[
          'mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14 lg:py-20',
          'font-serif text-foreground',
          className,
        ].join(' ')}
      >
        {children}
      </article>
    </main>
  )
}
