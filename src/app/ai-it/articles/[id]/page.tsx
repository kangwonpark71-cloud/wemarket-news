import { getAIITArticleById, getRelatedAIITArticles, toReaderSummary } from '@/lib/ai-it/db-service'
import { notFound } from 'next/navigation'
import {
  ArticleReader,
  ArticleHeader,
  ArticleHero,
  ArticleLead,
  ArticleBody,
  ArticleTags,
  ArticleFooter,
  ArticleSummary,
  type ReaderArticle,
  type ReaderRelatedArticle,
  type ReaderTag,
  type ReaderLanguage,
} from '@/components/reader'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'AI/IT 기사 상세',
  description: 'AI/IT 뉴스 기사 전문 보기',
}

export default async function AIITArticleDetailPage({ params }: Props) {
  const { id } = await params
  const article = await getAIITArticleById(id)
  if (!article) notFound()

  const source = article.source
  const isKorean = article.language === 'ko'
  const language: ReaderLanguage = isKorean ? 'ko' : 'en'
  const backHref = source.category === 'ai' ? '/ai-news' : '/it-news'
  const backLabel = source.category === 'ai'
    ? (isKorean ? 'AI 뉴스 목록으로' : 'Back to AI News')
    : (isKorean ? 'IT 뉴스 목록으로' : 'Back to IT News')

  const readerArticle: ReaderArticle = {
    id: article.id,
    title: article.title,
    url: article.url,
    description: article.description,
    content: article.content,
    author: article.author,
    thumbnail: article.thumbnail,
    publishedAt: article.publishedAt,
    language: article.language,
    category: article.category,
    source: {
      name: source.name,
      icon: source.icon,
      category: source.category,
      subcategory: source.subcategory,
    },
    tags: (article.tags as ReaderTag[]) || [],
    summary: toReaderSummary(article.summary),
  }

  const relatedRaw = await getRelatedAIITArticles(id, 4)

  const related: ReaderRelatedArticle[] = relatedRaw.map((rel) => ({
    id: rel.id,
    title: rel.title,
    publishedAt: rel.publishedAt,
    source: { name: rel.source.name },
  }))

  return (
    <ArticleReader language={language}>
      <ArticleHeader
        article={readerArticle}
        language={language}
        backHref={backHref}
        backLabel={backLabel}
      />

      {article.thumbnail && (
        <ArticleHero
          src={article.thumbnail}
          alt={article.title}
          caption={isKorean ? `${source.name} 제공` : `Source: ${source.name}`}
        />
      )}

      {article.description && <ArticleLead text={article.description} />}

      {article.summary && article.summary.summary3Line && (
        <ArticleSummary summary={readerArticle.summary!} language={language} />
      )}

      {article.content ? (
        <ArticleBody content={article.content} />
      ) : (
        <div className="rounded-sm bg-muted/50 p-8 text-center text-muted-foreground" role="alert">
          <p className="mb-4 text-lg">
            {isKorean
              ? '전체 기사 내용을 불러올 수 없습니다.'
              : 'Could not load the full article content.'}
          </p>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm bg-primary/10 px-4 py-2 font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {isKorean ? '원문 보기' : 'Read original article'}
          </a>
        </div>
      )}

      {article.tags && article.tags.length > 0 && (
        <ArticleTags tags={readerArticle.tags!} language={language} />
      )}

      <ArticleFooter
        article={readerArticle}
        related={related}
        language={language}
      />
    </ArticleReader>
  )
}
