import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getTodayBriefing,
  type BriefingMarketSnapshot,
  type BriefingMover,
} from '@/lib/services/briefing/briefing-service'

export const metadata: Metadata = {
  title: '오늘의 경제 브리핑 - 위마켓_뉴스',
  description: '지난 24시간 동안 가장 많이 읽힌 경제 뉴스와 주요 시장 지표를 정리한 오늘의 브리핑',
}

// 5분 주기로 재검증 (getTodayBriefing 내부 캐시와 동일한 주기)
// force-dynamic: 빌드 시 정적 프리렌더가 DB에 접근해 실패하는 것 방지 (캐시는 briefing-service가 담당)
export const dynamic = 'force-dynamic'

function formatSigned(rate: number | undefined): string {
  if (rate === undefined) return '-'
  const sign = rate > 0 ? '+' : ''
  return `${sign}${rate.toFixed(2)}%`
}

function formatPrice(item: {
  value?: number
  price?: number
  rate?: boolean
}): string {
  if (item.rate) {
    return item.price !== undefined ? item.price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-'
  }
  return item.value !== undefined ? item.value.toLocaleString('ko-KR') : '-'
}

function marketItems(snapshot: BriefingMarketSnapshot) {
  return [
    { label: 'KOSPI', value: snapshot.kospi?.value, changeRate: snapshot.kospi?.changeRate },
    { label: 'KOSDAQ', value: snapshot.kosdaq?.value, changeRate: snapshot.kosdaq?.changeRate },
    { label: 'USD/KRW', price: snapshot.usdKrw?.price, changeRate: snapshot.usdKrw?.changeRate, rate: true },
    { label: 'NASDAQ', price: snapshot.nasdaq?.price, changeRate: snapshot.nasdaq?.changeRate },
    { label: 'S&P 500', price: snapshot.sp500?.price, changeRate: snapshot.sp500?.changeRate },
    { label: 'BTC', price: snapshot.btc?.price, changeRate: snapshot.btc?.changeRate },
    { label: 'ETH', price: snapshot.eth?.price, changeRate: snapshot.eth?.changeRate },
  ]
}

function renderMovers(title: string, movers: BriefingMover[], className: string) {
  if (movers.length === 0) return null
  return (
    <div>
      <h3 className={`mb-1.5 text-[10px] font-bold ${className}`}>{title}</h3>
      <ul className="divide-y divide-border">
        {movers.map((m) => (
          <li key={m.code} className="flex items-center justify-between py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-foreground">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {m.market} · {m.code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{m.price.toLocaleString('ko-KR')}</span>
              <span className={`w-14 text-right text-[10px] font-bold ${m.changeRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {formatSigned(m.changeRate)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function BriefingPage() {
  const briefing = await getTodayBriefing()
  const items = briefing.market ? marketItems(briefing.market) : []
  const hasMarketData = items.some(
    (i) => i.value !== undefined || i.price !== undefined,
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-lg font-bold text-foreground">📋 오늘의 경제 브리핑</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {briefing.date} 기준 · 지난 24시간 가장 많이 읽힌 뉴스
        </p>
        {briefing.overview && (
          <p className="mt-3 rounded-sm border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground">
            📈 {briefing.overview}
          </p>
        )}
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

      {hasMarketData && (
        <section className="mb-6">
          <div className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-3 py-2">
              <h2 className="text-xs font-bold text-foreground">📊 주요 시장 지표</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {items.map((item) =>
                item.value !== undefined || item.price !== undefined ? (
                  <div key={item.label} className="bg-card px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice({ value: item.value, price: item.price, rate: item.rate })}
                    </p>
                    <p className={`text-[10px] font-semibold ${(item.changeRate ?? 0) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                      {formatSigned(item.changeRate)}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
        </section>
      )}

      {briefing.movers && (briefing.movers.gainers.length > 0 || briefing.movers.losers.length > 0) && (
        <section className="mb-6">
          <div className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-3 py-2">
              <h2 className="text-xs font-bold text-foreground">🚀 시장 동향 · 급등/급락 종목</h2>
            </div>
            <div className="grid gap-4 p-3 md:grid-cols-2">
              {renderMovers('📈 급등 종목', briefing.movers.gainers, 'text-red-500')}
              {renderMovers('📉 급락 종목', briefing.movers.losers, 'text-blue-500')}
            </div>
          </div>
        </section>
      )}

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
