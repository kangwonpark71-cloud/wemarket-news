import { Metadata } from 'next';
import { getAIITArticles, getAIITArticleStats, getSubcategoriesWithCount, getActiveAIITSources, type AINewsWithSource } from '@/lib/ai-it/db-service';
import NewsSidebar from '@/components/ai-it/NewsSidebar';
import FilterBar from '@/components/ai-it/FilterBar';
import NewsCard from '@/components/ai-it/NewsCard';

export const metadata: Metadata = {
  title: 'IT News - 최신 IT/테크 뉴스',
  description: '국내외 주요 IT 매체의 최신 기술 뉴스를 실시간으로 확인하세요. 블로터, 지디넷코리아, IT조선, TechCrunch, The Verge, Ars Technica 등.',
};

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

interface IT_NewsPageProps {
  searchParams: Promise<{
    subcategory?: string;
    language?: string;
    source?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    tags?: string;
    period?: string;
  }>;
}

export default async function ITNewsPage({ searchParams }: IT_NewsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const sortBy = params.sortBy || 'publishedAt';
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';
  const subcategory = params.subcategory;
  const language = params.language as 'ko' | 'en' | undefined;
  const sourceId = params.source;
  
  const { dateFrom, dateTo } = calcDateRange(params.period);

  const [articlesResult, , subcategories, sources] = await Promise.all([
    getAIITArticles({
      category: 'it',
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
    getSubcategoriesWithCount('it'),
    getActiveAIITSources('it'),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">IT News</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            국내외 주요 IT 매체의 최신 기술 뉴스 - 블로터, 지디넷코리아, IT조선, TechCrunch, The Verge, Ars Technica 등
          </p>
        </div>

        <div className="flex gap-8">
          <NewsSidebar category="it" subcategories={subcategories} />

          <div className="min-w-0 flex-1">
            <FilterBar
              category="it"
              sources={sources.map((s: { id: string; name: string; nameEn: string; icon: string | null }) => ({ id: s.id, name: s.name, nameEn: s.nameEn, icon: s.icon || undefined }))}
              tags={[]}
              totalCount={articlesResult.total}
              currentPage={articlesResult.page}
              totalPages={articlesResult.totalPages}
            />

            {articlesResult.articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-6xl mb-4">💻</div>
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
                        summary: article.summary ? {
                          summary3Line: article.summary.summary3Line,
                          keywords: article.summary.keywords,
                          relatedCompanies: article.summary.relatedCompanies,
                          relatedModels: article.summary.relatedModels,
                          difficulty: article.summary.difficulty ?? 'beginner',
                        } : undefined,
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
                        href={`/it-news?page=${articlesResult.page - 1}${subcategory ? `&subcategory=${subcategory}` : ''}${language ? `&language=${language}` : ''}`}
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
                        href={`/it-news?page=${articlesResult.page + 1}${subcategory ? `&subcategory=${subcategory}` : ''}${language ? `&language=${language}` : ''}`}
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