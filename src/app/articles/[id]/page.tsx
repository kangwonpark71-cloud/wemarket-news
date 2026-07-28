import { getArticleById, getRelatedArticles, saveArticleContent, saveTranslatedContent } from '@/lib/rss/db-service'
import { scrapeArticleContent, stripJunkPatterns } from '@/lib/rss/content-scraper'
import { translateFullContent } from '@/lib/ai/llm-service'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { absoluteUrl } from '@/lib/utils'
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) {
    return { title: '기사를 찾을 수 없습니다 - 경제뉴스' }
  }

  const description = article.description || '경제 뉴스 기사 전문을 확인하세요.'
  const url = absoluteUrl(`/articles/${article.id}`)

  return {
    title: `${article.title} - 경제뉴스`,
    description,
    openGraph: {
      type: 'article',
      title: article.title,
      description,
      url,
      siteName: '경제뉴스',
      publishedTime: article.publishedAt.toISOString(),
      images: article.thumbnail ? [{ url: article.thumbnail }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: article.thumbnail ? [article.thumbnail] : undefined,
    },
  }
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

  if (article.content) {
    const cleaned = stripJunkPatterns(article.content)
    if (cleaned !== article.content) {
      await saveArticleContent(id, cleaned)
      article.content = cleaned
    }
  }

  const isEnglish = article.language === 'en'

  if (isEnglish && article.content && !article.translatedContent) {
    try {
      const translated = await translateFullContent(article.title, article.content)
      if (translated) {
        await saveTranslatedContent(id, translated)
        article.translatedContent = translated
      }
    } catch (err) {
      console.warn('[Article] Full translation failed:', err)
    }
  }
  const language: ReaderLanguage = isEnglish ? 'en' : 'ko'
  const source = article.source
  const translatedTitle = article.summary?.translatedTitle

  const categoryHrefMap: Record<string, string> = {
    domestic: '/domestic',
    overseas: '/overseas',
    medical: '/medical',
    smallbiz: '/smallbiz',
  }
  const backHref = categoryHrefMap[source.category] || '/'
  const backLabelMap: Record<string, { ko: string; en: string }> = {
    domestic: { ko: '국내 경제 뉴스로', en: 'Back to Domestic' },
    overseas: { ko: '해외 경제 뉴스로', en: 'Back to Overseas' },
    medical: { ko: '의료 뉴스로', en: 'Back to Medical' },
    smallbiz: { ko: '소상공인 뉴스로', en: 'Back to Small Business' },
  }
  const backLabel = isEnglish
    ? (backLabelMap[source.category]?.en || 'Back to list')
    : (backLabelMap[source.category]?.ko || '이전 지면으로')

  const relatedRaw = await getRelatedArticles(id, 4)

  const related: ReaderRelatedArticle[] = relatedRaw.map((rel) => ({
    id: rel.id,
    title: rel.title,
    publishedAt: rel.publishedAt,
    source: { name: rel.source.name },
    hrefBase: '/articles',
  }))

  return (
    <ArticleReader language={language}>
      <ArticleHeader
        article={{
          id: article.id,
          title: isEnglish && translatedTitle ? translatedTitle : article.title,
          originalTitle: isEnglish ? article.title : undefined,
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
        backHref={backHref}
        backLabel={backLabel}
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
        <div>
          <ArticleBody content={article.content} />

          {isEnglish && article.translatedContent && (
            <div className="mt-8">
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm font-medium text-muted-foreground">
                    한국어 번역
                  </span>
                </div>
              </div>
              <ArticleBody content={article.translatedContent} />
            </div>
          )}

          {isEnglish && !article.translatedContent && (
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">한국어 번역을 준비 중입니다...</p>
            </div>
          )}
        </div>
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
