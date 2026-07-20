import { getArticleById, saveArticleContent } from '@/lib/rss/db-service'
import { scrapeArticleContent } from '@/lib/rss/content-scraper'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import {
  ArticleReader,
  ArticleHeader,
  ArticleHero,
  ArticleLead,
  ArticleBody,
  ArticleFooter,
  type ReaderRelatedArticle,
  type ReaderLanguage,
} from '@/components/reader'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: '기사 상세 - 경제뉴스',
  description: '경제 뉴스 기사 전문 보기',
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  if (!article.content) {
    const result = await scrapeArticleContent(article.url)
    if (result.content) {
      await saveArticleContent(id, result.content)
      article.content = result.content
    }
  }

  const isEnglish = article.language === 'en'
  const language: ReaderLanguage = isEnglish ? 'en' : 'ko'
  const source = article.source

  const relatedRaw = await prisma.article.findMany({
    where: {
      id: { not: id },
      OR: [
        { category: article.category || undefined },
        { sourceId: article.sourceId },
      ],
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
    include: { source: true },
  })

  const related: ReaderRelatedArticle[] = relatedRaw.map((rel) => ({
    id: rel.id,
    title: rel.title,
    publishedAt: rel.publishedAt,
    source: { name: rel.source.name },
  }))

  return (
    <ArticleReader language={language}>
      <ArticleHeader
        article={{
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
          source: { name: source.name, icon: source.icon, category: source.category },
        }}
        language={language}
        backHref="/"
        backLabel={isEnglish ? 'Back to list' : '이전 지면으로'}
      />

      {article.thumbnail && (
        <ArticleHero
          src={article.thumbnail}
          alt={article.title}
          caption={isEnglish ? 'Source: ' + source.name : source.name + ' 제공'}
        />
      )}

      {article.description && <ArticleLead text={article.description} />}

      {article.content ? (
        <ArticleBody content={article.content} />
      ) : (
        <div className="rounded-sm bg-muted/50 p-8 text-center text-muted-foreground" role="alert">
          <p className="mb-4 text-lg">
            {isEnglish
              ? 'Could not load the full article content.'
              : '전체 기사 내용을 불러올 수 없습니다.'}
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
            {isEnglish ? 'Read original article' : '원문 보기'}
          </a>
        </div>
      )}

      <ArticleFooter
        article={{
          id: article.id,
          title: article.title,
          url: article.url,
          publishedAt: article.publishedAt,
          language: article.language,
          source: { name: source.name, icon: source.icon },
        }}
        related={related}
        language={language}
      />
    </ArticleReader>
  )
}
