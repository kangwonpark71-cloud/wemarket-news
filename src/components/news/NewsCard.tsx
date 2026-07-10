import { ArticleWithSource } from '@/lib/rss/db-service'
import { formatDate, truncate } from '@/lib/utils'

interface NewsCardProps {
  article: ArticleWithSource
  compact?: boolean
}

export default function NewsCard({ article, compact = false }: NewsCardProps) {
  const source = article.source
  const isEnglish = article.language === 'en'

  return (
    <article className="group rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex gap-4">
        {article.thumbnail && !compact && (
          <div className="hidden h-20 w-20 shrink-0 sm:block">
            <img
              src={article.thumbnail}
              alt=""
              className="h-full w-full rounded-lg object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              <span>{source.icon || '📰'}</span>
              <span>{source.name}</span>
            </span>
            {article.category && article.category !== source.subcategory && (
              <span className="text-xs text-gray-500">{article.category}</span>
            )}
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block text-sm font-semibold leading-tight text-gray-900 group-hover:text-blue-600 sm:text-base"
          >
            {article.title}
          </a>

          {!compact && article.description && (
            <p className="mb-3 text-sm leading-relaxed text-gray-600">
              {truncate(article.description, isEnglish ? 200 : 150)}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <time dateTime={article.publishedAt.toISOString()}>
              {formatDate(article.publishedAt, article.language as 'ko' | 'en')}
            </time>
            {article.author && (
              <>
                <span className="text-gray-300">|</span>
                <span>{article.author}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
