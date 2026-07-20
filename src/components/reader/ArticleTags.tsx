import type { ReaderTag, ReaderLanguage } from './types'

interface ArticleTagsProps {
  tags: ReaderTag[]
  language: ReaderLanguage
}

export function ArticleTags({ tags, language }: ArticleTagsProps) {
  if (!tags || tags.length === 0) return null
  const isKorean = language === 'ko'

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2" aria-label={isKorean ? '태그' : 'Tags'}>
      {tags.map((t) => (
        <span
          key={t.tag.name}
          className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          #{t.tag.name}
        </span>
      ))}
    </div>
  )
}
