// 독서 경험 컴포넌트 공용 타입

export interface ReaderSource {
  name: string
  icon?: string | null
  category?: string | null
  subcategory?: string | null
}

export interface ReaderArticle {
  id: string
  title: string
  url: string
  description?: string | null
  content?: string | null
  author?: string | null
  thumbnail?: string | null
  publishedAt: Date
  language: string
  category?: string | null
  source: ReaderSource
  tags?: ReaderTag[]
  summary?: ReaderSummary | null
}

export interface ReaderTag {
  tag: {
    name: string
    type?: string
  }
}

export interface ReaderSummary {
  translatedTitle?: string | null
  summary3Line: string
  keywords: string[]
  relatedCompanies: string[]
  relatedModels: string[]
  difficulty?: string | null
}

export interface ReaderRelatedArticle {
  id: string
  title: string
  publishedAt: Date
  source: ReaderSource
  hrefBase?: string
}

export type ReaderLanguage = 'ko' | 'en'
