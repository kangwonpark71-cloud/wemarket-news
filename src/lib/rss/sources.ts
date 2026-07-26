// RSS 소스 정의
// 모든 RSS 피드 URL과 메타데이터를 중앙 관리

export interface RSSSourceConfig {
  name: string
  nameEn: string
  url: string
  category: 'domestic' | 'overseas' | 'medical' | 'smallbiz'
  subcategory: string
  language: 'ko' | 'en'
  icon?: string
  fetchInterval?: number // 시간 단위 (기본 3)
}

// 국내 경제 소스
export const DOMESTIC_SOURCES: RSSSourceConfig[] = [
  {
    name: '한국경제',
    nameEn: 'hankyung',
    url: 'https://www.hankyung.com/feed/economy',
    category: 'domestic',
    subcategory: 'korean_economy',
    language: 'ko',
    icon: '🏦',
  },
  {
    name: '매일경제',
    nameEn: 'mk',
    url: 'https://www.mk.co.kr/rss/30100041/',
    category: 'domestic',
    subcategory: 'mk_economy',
    language: 'ko',
    icon: '📊',
  },
]

// 해외 경제 소스 (연준/Fed)
export const OVERSEAS_SOURCES: RSSSourceConfig[] = [
  {
    name: 'Fed Press Releases',
    nameEn: 'fed_press',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    category: 'overseas',
    subcategory: 'press_releases',
    language: 'en',
    icon: '🏛️',
  },
  {
    name: 'Monetary Policy',
    nameEn: 'fed_monetary',
    url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
    category: 'overseas',
    subcategory: 'monetary_policy',
    language: 'en',
    icon: '💰',
  },
  {
    name: 'Speeches & Testimony',
    nameEn: 'fed_speeches',
    url: 'https://www.federalreserve.gov/feeds/speeches_and_testimony.xml',
    category: 'overseas',
    subcategory: 'speeches',
    language: 'en',
    icon: '🎤',
  },
  {
    name: 'FEDS Notes',
    nameEn: 'fed_notes',
    url: 'https://www.federalreserve.gov/feeds/feds_notes.xml',
    category: 'overseas',
    subcategory: 'feds_notes',
    language: 'en',
    icon: '📝',
  },
  {
    name: 'Selected Interest Rates',
    nameEn: 'fed_interest_rates',
    url: 'https://www.federalreserve.gov/feeds/h15.xml',
    category: 'overseas',
    subcategory: 'interest_rates',
    language: 'en',
    icon: '📈',
  },
  {
    name: 'Foreign Exchange Rates',
    nameEn: 'fed_exchange_rates',
    url: 'https://www.federalreserve.gov/feeds/h10.xml',
    category: 'overseas',
    subcategory: 'exchange_rates',
    language: 'en',
    icon: '💱',
  },
]

// =============================================
// 의료/의사 뉴스 소스
// =============================================

export const MEDICAL_SOURCES: RSSSourceConfig[] = [
  {
    name: '의협신문',
    nameEn: 'doctorsnews',
    url: 'http://www.doctorsnews.co.kr/rss/allArticle.xml',
    category: 'medical',
    subcategory: 'medical_policy',
    language: 'ko',
    icon: '🏥',
  },
  {
    name: '보사',
    nameEn: 'bosa',
    url: 'https://www.bosa.co.kr/rss/allArticle.xml',
    category: 'medical',
    subcategory: 'medical_policy',
    language: 'ko',
    icon: '📋',
  },
  {
    name: '히트뉴스',
    nameEn: 'hitnews',
    url: 'https://www.hitnews.co.kr/rss/allArticle.xml',
    category: 'medical',
    subcategory: 'medical_pharma',
    language: 'ko',
    icon: '💊',
  },
  {
    name: 'The Lancet',
    nameEn: 'lancet',
    url: 'https://www.thelancet.com/rssfeed/lancet_current.xml',
    category: 'medical',
    subcategory: 'medical_research',
    language: 'en',
    icon: '🔬',
  },
  {
    name: 'FDA Press Releases',
    nameEn: 'fda_press',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    category: 'medical',
    subcategory: 'medical_policy',
    language: 'en',
    icon: '🏛️',
  },
]

// =============================================
// 소상공인 뉴스 소스
// =============================================

export const SMALLBIZ_SOURCES: RSSSourceConfig[] = [
  {
    name: '한국소상공인신문',
    nameEn: 'ksbnews',
    url: 'https://www.ksbnews.co.kr/rss/allArticle.xml',
    category: 'smallbiz',
    subcategory: 'sbiz_general',
    language: 'ko',
    icon: '🏪',
  },
  {
    name: '식품외식경제',
    nameEn: 'foodbank',
    url: 'https://www.foodbank.co.kr/rss/allArticle.xml',
    category: 'smallbiz',
    subcategory: 'sbiz_food',
    language: 'ko',
    icon: '🍽️',
  },
]

// 모든 소스 통합
export const ALL_SOURCES: RSSSourceConfig[] = [...DOMESTIC_SOURCES, ...OVERSEAS_SOURCES, ...MEDICAL_SOURCES, ...SMALLBIZ_SOURCES]

// 카테고리별 소스 가져오기
export function getSourcesByCategory(category: 'domestic' | 'overseas' | 'medical' | 'smallbiz'): RSSSourceConfig[] {
  return ALL_SOURCES.filter((s) => s.category === category)
}

// 소스 이름으로 찾기
export function getSourceByName(nameEn: string): RSSSourceConfig | undefined {
  return ALL_SOURCES.find((s) => s.nameEn === nameEn)
}

// 서브카테고리 한글 매핑
export const SUBCATEGORY_LABELS: Record<string, string> = {
  // 국내
  korean_economy: '한국 경제',
  mk_economy: '매일 경제',
  // 해외
  press_releases: 'Press Releases',
  monetary_policy: 'Monetary Policy',
  speeches: 'Speeches & Testimony',
  feds_notes: 'FEDS Notes',
  interest_rates: 'Selected Interest Rates',
  exchange_rates: 'Foreign Exchange Rates',
  // 의료
  medical_policy: '의료정책',
  medical_pharma: '제약·신약',
  medical_research: '해외 의학 연구',
  // 소상공인
  sbiz_general: '일반 소상공인',
  sbiz_food: '외식·카페',
}

// 카테고리 한글 매핑
export const CATEGORY_LABELS: Record<string, string> = {
  domestic: '국내 경제',
  overseas: '해외 경제',
  medical: '의료',
  smallbiz: '소상공인',
  all: '전체 뉴스',
}
