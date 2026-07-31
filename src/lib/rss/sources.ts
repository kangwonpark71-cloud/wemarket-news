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
  excludeKeywords?: string[] // 제목에 포함되면 제외할 키워드 (피드 오분류 방지)
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
  {
    name: '연합뉴스TV 경제',
    nameEn: 'yonhapnewstv_economy',
    url: 'http://www.yonhapnewstv.co.kr/category/news/economy/feed/',
    category: 'domestic',
    subcategory: 'yonhapnewstv_economy',
    language: 'ko',
    icon: '📺',
  },
  {
    name: '연합뉴스TV 최신',
    nameEn: 'yonhapnewstv_latest',
    url: 'http://www.yonhapnewstv.co.kr/browse/feed/',
    category: 'domestic',
    subcategory: 'yonhapnewstv_latest',
    language: 'ko',
    icon: '📺',
  },
]

// =============================================
// 국내 카테고리별 소스 (정치, 사회, 문화, 연예, 스포츠)
// =============================================

export const DOMESTIC_CATEGORY_SOURCES: RSSSourceConfig[] = [
  // 정치
  {
    name: '연합뉴스TV 정치',
    nameEn: 'yonhapnewstv_politics',
    url: 'http://www.yonhapnewstv.co.kr/category/news/politics/feed/',
    category: 'domestic',
    subcategory: 'politics',
    language: 'ko',
    icon: '🏛️',
  },
  {
    name: 'YTN 정치',
    nameEn: 'ytn_politics',
    url: 'https://www.ytn.co.kr/rss/rss_politics.xml',
    category: 'domestic',
    subcategory: 'politics',
    language: 'ko',
    icon: '📺',
  },
  // 사회
  {
    name: '연합뉴스TV 사회',
    nameEn: 'yonhapnewstv_society',
    url: 'http://www.yonhapnewstv.co.kr/category/news/society/feed/',
    category: 'domestic',
    subcategory: 'society',
    language: 'ko',
    icon: '👥',
  },
  {
    name: 'YTN 사회',
    nameEn: 'ytn_society',
    url: 'https://www.ytn.co.kr/rss/rss_society.xml',
    category: 'domestic',
    subcategory: 'society',
    language: 'ko',
    icon: '📺',
  },
  // 문화
  {
    name: '연합뉴스TV 문화',
    nameEn: 'yonhapnewstv_culture',
    url: 'http://www.yonhapnewstv.co.kr/category/news/culture/feed/',
    category: 'domestic',
    subcategory: 'culture',
    language: 'ko',
    icon: '🎭',
  },
  {
    name: 'YTN 문화',
    nameEn: 'ytn_culture',
    url: 'https://www.ytn.co.kr/rss/rss_culture.xml',
    category: 'domestic',
    subcategory: 'culture',
    language: 'ko',
    icon: '📺',
  },
  // 연예
  {
    name: '한국경제 연예',
    nameEn: 'hankyung_entertainment',
    url: 'https://www.hankyung.com/feed/entertainment',
    category: 'domestic',
    subcategory: 'entertainment',
    language: 'ko',
    icon: '🎬',
  },
  {
    name: '서울경제 서경스타',
    nameEn: 'sedaily_entertainment',
    url: 'https://www.sedaily.com/Rss/Entertainment',
    category: 'domestic',
    subcategory: 'entertainment',
    language: 'ko',
    icon: '🌟',
  },
  // 스포츠
  {
    name: '연합뉴스TV 스포츠',
    nameEn: 'yonhapnewstv_sports',
    url: 'http://www.yonhapnewstv.co.kr/category/news/sports/feed/',
    category: 'domestic',
    subcategory: 'sports',
    language: 'ko',
    icon: '⚽',
    excludeKeywords: [
      '코스피', '코스닥', '비트코인', '가상자산', 'ETF', '증시', '주가',
      '시세', '환율', '금리', '사이드카', '미수거래', '레버리지', '예탁금',
      '반대매매', '폭등', '급락', '삼성전자', 'SK하이닉스', '퇴근길머니',
    ],
  },
  {
    name: 'YTN 스포츠',
    nameEn: 'ytn_sports',
    url: 'https://www.ytn.co.kr/rss/rss_sports.xml',
    category: 'domestic',
    subcategory: 'sports',
    language: 'ko',
    icon: '📺',
  },
]

// =============================================
// 해외 카테고리별 소스 (미국, 유럽, 아시아)
// =============================================

export const OVERSEAS_CATEGORY_SOURCES: RSSSourceConfig[] = [
  // 미국
  {
    name: 'CNBC Top News',
    nameEn: 'cnbc_top',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
    category: 'overseas',
    subcategory: 'us_news',
    language: 'en',
    icon: '🇺🇸',
  },
  {
    name: 'NPR Top News',
    nameEn: 'npr_top',
    url: 'https://feeds.npr.org/1001/rss.xml',
    category: 'overseas',
    subcategory: 'us_news',
    language: 'en',
    icon: '🇺🇸',
  },
  {
    name: 'BBC US & Canada',
    nameEn: 'bbc_us',
    url: 'http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml',
    category: 'overseas',
    subcategory: 'us_news',
    language: 'en',
    icon: '🇺🇸',
  },
  // 유럽
  {
    name: 'BBC Europe',
    nameEn: 'bbc_europe',
    url: 'http://feeds.bbci.co.uk/news/world/europe/rss.xml',
    category: 'overseas',
    subcategory: 'europe_news',
    language: 'en',
    icon: '🇪🇺',
  },
  // 아시아
  {
    name: 'BBC Asia',
    nameEn: 'bbc_asia',
    url: 'http://feeds.bbci.co.uk/news/world/asia/rss.xml',
    category: 'overseas',
    subcategory: 'asia_news',
    language: 'en',
    icon: '🌏',
  },
  {
    name: 'BBC Middle East',
    nameEn: 'bbc_middle_east',
    url: 'http://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
    category: 'overseas',
    subcategory: 'asia_news',
    language: 'en',
    icon: '🌏',
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
export const ALL_SOURCES: RSSSourceConfig[] = [
  ...DOMESTIC_SOURCES,
  ...DOMESTIC_CATEGORY_SOURCES,
  ...OVERSEAS_SOURCES,
  ...OVERSEAS_CATEGORY_SOURCES,
  ...MEDICAL_SOURCES,
  ...SMALLBIZ_SOURCES,
]

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
  korean_economy: '한국 경제',
  mk_economy: '매일 경제',
  yonhapnewstv_economy: '연합뉴스TV 경제',
  yonhapnewstv_latest: '연합뉴스TV 최신',
  politics: '정치',
  society: '사회',
  culture: '문화',
  entertainment: '연예',
  sports: '스포츠',
  press_releases: 'Press Releases',
  monetary_policy: 'Monetary Policy',
  speeches: 'Speeches & Testimony',
  feds_notes: 'FEDS Notes',
  interest_rates: 'Selected Interest Rates',
  exchange_rates: 'Foreign Exchange Rates',
  us_news: '미국 뉴스',
  europe_news: '유럽 뉴스',
  asia_news: '아시아 뉴스',
  medical_policy: '의료정책',
  medical_pharma: '제약·신약',
  medical_research: '해외 의학 연구',
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
