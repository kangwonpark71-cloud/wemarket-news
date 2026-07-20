import type { ReaderSummary, ReaderLanguage } from './types'

interface ArticleSummaryProps {
  summary: ReaderSummary
  language: ReaderLanguage
}

const DIFFICULTY_LABEL: Record<string, { ko: string; en: string }> = {
  beginner: { ko: '초급', en: 'Beginner' },
  intermediate: { ko: '중급', en: 'Intermediate' },
  advanced: { ko: '고급', en: 'Advanced' },
}

export function ArticleSummary({ summary, language }: ArticleSummaryProps) {
  const isKorean = language === 'ko'
  const hasContent =
    summary.summary3Line ||
    summary.keywords.length > 0 ||
    summary.relatedCompanies.length > 0 ||
    summary.relatedModels.length > 0

  if (!hasContent) return null

  const difficulty = summary.difficulty
    ? DIFFICULTY_LABEL[summary.difficulty]?.[isKorean ? 'ko' : 'en']
    : null

  return (
    <aside className="my-8 rounded-sm border border-border bg-muted/40 p-5 sm:p-6 lg:my-10" aria-label="AI 요약">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          AI Summary
        </span>
        {difficulty && (
          <span className="text-xs font-medium text-muted-foreground">
            난이도: {difficulty}
          </span>
        )}
      </div>

      {summary.summary3Line && (
        <p className="mb-4 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {summary.summary3Line}
        </p>
      )}

      {summary.keywords.length > 0 && (
        <div className="mb-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isKorean ? '키워드' : 'Keywords'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {summary.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-sm bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {(summary.relatedCompanies.length > 0 || summary.relatedModels.length > 0) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isKorean ? '관련 항목' : 'Related'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {summary.relatedCompanies.map((c) => (
              <span
                key={`c-${c}`}
                className="rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
              >
                {c}
              </span>
            ))}
            {summary.relatedModels.map((m) => (
              <span
                key={`m-${m}`}
                className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
