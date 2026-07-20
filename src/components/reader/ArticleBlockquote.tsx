import type { ReactNode } from 'react'

interface ArticleBlockquoteProps {
  children: ReactNode
}

export function ArticleBlockquote({ children }: ArticleBlockquoteProps) {
  return (
    <blockquote className="my-8 border-l-4 border-primary bg-primary/[0.03] py-4 pl-6 pr-4 font-serif text-lg italic leading-[1.7] text-foreground/80 sm:text-xl lg:-mx-8 lg:pl-8 lg:pr-8">
      {children}
    </blockquote>
  )
}
