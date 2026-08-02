import { Metadata } from 'next';
import { getAIITArticles, getAIITArticleStats, getSubcategoriesWithCount, getActiveAIITSources, toReaderSummary, type AINewsWithSource } from '@/lib/ai-it/db-service';
import NewsSidebar from '@/components/ai-it/NewsSidebar';
import FilterBar from '@/components/ai-it/FilterBar';
import NewsCard from '@/components/ai-it/NewsCard';

export const metadata: Metadata = {
  title: 'AI/IT News - 인공지능 & IT 뉴스',
  description: 'AI와 IT 분야의 최신 뉴스를 실시간으로 확인하세요.',
};

interface AI_IT_NewsPageProps {
  searchParams: Promise<{
    subcategory?: string;
    language?: string;
    source?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    tags?: string;
    period?: string;
    category?: string;
  }>;
}

function calcDateRange(period: string | undefined): { dateFrom: Date | undefined; dateTo: Date | undefined } {
  const now = Date.now();
  if (period === '1h') {
    return { dateFrom: new Date(now - 60 * 60 * 1000), dateTo: undefined };
  } else if (period === '24h') {
    return { dateFrom: new Date(now - 24 * 60 * 60 * 1000), dateTo: undefined };
  } else if (period === '7d') {
    return { dateFrom: new Date(now - 7 * 24 * 60 * 60 * 1000), dateTo: undefined };
  }
  return { dateFrom: undefined, dateTo: undefined };
}

export default async function AI_IT_NewsPage({ searchParams }: AI_IT_NewsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const sortBy = params.sortBy || 'publishedAt';
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';
  const subcategory = params.subcategory;
  const language = params.language as 'ko' | 'en' | undefined;
  const sourceId = params.source;
  const category = (params.category || 'ai') as 'ai' | 'it';

  const { dateFrom, dateTo } = calcDateRange(params.period);

  const [articlesResult, , subcategories, sources] = await Promise.all([
    getAIITArticles({
      category,
      subcategory,
      language,
      page,
      limit,
      sortBy,
      sortOrder,
      sourceId,
      dateFrom,
      dateTo,
    }),
    getAIITArticleStats(),
    getSubcategoriesWithCount(category),
    getActiveAIITSources(category),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {category === 'ai' ? 'AI News' : 'IT News'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {category === 'ai'
              ? 'OpenAI, Anthropic, Google, Microsoft 등 공식 AI 블로그와 주요 기술 매체의 최신 AI 뉴스'
              : '국내외 주요 IT 매체의 최신 기술 뉴스 - 블로터, 지디넷코리아, IT조선, TechCrunch, The Verge, Ars Technica 등'}
          </p>
        </div>

        <div className="flex gap-8">
          <NewsSidebar category={category} subcategories={subcategories} />

          <div className="min-w-0 flex-1">
            <FilterBar
              category={category}
              sources={sources.map((s: { id: string; name: string; nameEn: string; icon: string | null }) => ({ id: s.id, name: s.name, nameEn: s.nameEn, icon: s.icon || undefined }))}
              tags={[]}
              totalCount={articlesResult.total}
              currentPage={articlesResult.page}
              totalPages={articlesResult.totalPages}
            />

            {articlesResult.articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">{category === 'ai' ? '🤖' : '💻'}</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">기사가 없습니다</h2>
                <p className="text-muted-foreground">선택한 필터에 해당하는 기사가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {articlesResult.articles.map((article: AINewsWithSource, index: number) => (
                    <NewsCard
                      key={article.id}
                      article={{
                        ...article,
                        publishedAt: article.publishedAt.toISOString(),
                        source: {
                          name: article.source.name,
                          nameEn: article.source.nameEn,
                          icon: article.source.icon,
                        },
                        summary: article.summary
                          ? toReaderSummary(article.summary)
                          : undefined,
                        tags: article.tags?.map((t: { tag: { name: string } }) => ({ tag: { name: t.tag.name } })) || [],
                        isBookmarked: article.isBookmarked,
                      }}
                      variant={index < 2 ? 'featured' : 'default'}
                    />
                  ))}
                </div>

                {articlesResult.totalPages > 1 && (
                  <nav className="mt-8 flex items-center justify-center gap-2" aria-label="페이지네이션">
                    {articlesResult.page > 1 && (
                      <a
                        href={`/ai-it?page=${articlesResult.page - 1}${subcategory ? `&subcategory=${subcategory}` : ''}${language ? `&language=${language}` : ''}&category=${category}`}
                        className="h-10 w-10 rounded-none border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                        aria-label="이전 페이지"
                      >
                        ←
                      </a>
                    )}
                    <span className="px-4 text-sm text-muted-foreground">
                      {articlesResult.page} / {articlesResult.totalPages}
                    </span>
                    {articlesResult.page < articlesResult.totalPages && (
                      <a
                        href={`/ai-it?page=${articlesResult.page + 1}${subcategory ? `&subcategory=${subcategory}` : ''}${language ? `&language=${language}` : ''}&category=${category}`}
                        className="h-10 w-10 rounded-none border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                        aria-label="다음 페이지"
                      >
                        →
                      </a>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}