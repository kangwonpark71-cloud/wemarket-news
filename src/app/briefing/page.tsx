import type { Metadata } from 'next'
import Link from 'next/link'
import { getTodayBriefing } from '@/lib/services/briefing/briefing-service'

export const metadata: Metadata = {
  title: '오늘의 경제 브리핑 - 위마켓_뉴스',
  description: '지난 24시간 동안 가장 많이 읽힌 경제 뉴스를 카테고리별로 정리한 오늘의 브리핑',
}

// 5분 주기로 재검증 (getTodayBriefing 내부 캐시와 동일한 주기)
// force-dynamic: 빌드 시 정적 프리렌더가 DB에 접근해 실패하는 것 방지 (캐시는 briefing-service가 담당)
export const dynamic = 'force-dynamic'

export default async function BriefingPage() {
  const briefing = await getTodayBriefing()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-lg font-bold text-foreground">📋 오늘의 경제 브리핑</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {briefing.date} 기준 · 지난 24시간 가장 많이 읽힌 뉴스
        </p>
        {briefing.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {briefing.keywords.map((k) => (
              <Link
                key={k.keyword}
                href={`/search?q=${encodeURIComponent(k.keyword)}`}
                className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                #{k.keyword}
                {k.count > 1 && <span className="ml-0.5 text-muted-foreground">{k.count}</span>}
              </Link>
            ))}
          </div>
        )}
      </header>

      <section className="mb-6">
        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-xs font-bold text-foreground">🔥 실시간 인기 헤드라인</h2>
          </div>
          <ol className="divide-y divide-border">
            {briefing.headline.map((article, i) => (
              <li key={article.id}>
                <Link
                  href={`/articles/${article.id}`}
                  className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted"
                >
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs leading-snug text-foreground">{article.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {article.source || ''} · 조회 {article.viewCount.toLocaleString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {briefing.sections.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {briefing.sections.map((section) => (
            <section key={section.key}>
              <div className="rounded-sm border border-border bg-card">
                <div className="border-b border-border px-3 py-2">
                  <h2 className="text-xs font-bold text-foreground">{section.label}</h2>
                </div>
                <ul className="divide-y divide-border">
                  {section.articles.map((article, i) => (
                    <li key={article.id}>
                      <Link
                        href={`/articles/${article.id}`}
                        className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted"
                      >
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs leading-snug text-foreground">{article.title}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{article.source || ''}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
