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
    url: 'https://news.google.com/rss/search?q=site%3Aytn.co.kr%20%EC%A0%95%EC%B9%98&hl=ko&gl=KR&ceid=KR:ko',
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
    url: 'https://news.google.com/rss/search?q=site%3Aytn.co.kr%20%EC%82%AC%ED%9A%8C&hl=ko&gl=KR&ceid=KR:ko',
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
    url: 'https://news.google.com/rss/search?q=site%3Aytn.co.kr%20%EB%AC%B8%ED%99%94&hl=ko&gl=KR&ceid=KR:ko',
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
      '주식', '투자자', '시세', '환율', '금리', '사이드카', '미수거래',
      '레버리지', '예탁금', '반대매매', '폭등', '급락', '삼성전자',
      'SK하이닉스', '퇴근길머니', '머스크', '테슬라', '스페이스X',
    ],
  },
  {
    name: 'YTN 스포츠',
    nameEn: 'ytn_sports',
    url: 'https://news.google.com/rss/search?q=site%3Aytn.co.kr%20%EC%8A%A4%ED%8F%AC%EC%B8%A0&hl=ko&gl=KR&ceid=KR:ko',
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

// =============================================
// 옥외광고(OOH) 뉴스 소스 (Google News RSS 검색 기반)
// - 매체사: 신규 전광판, LED, 미디어폴, 버스쉘터, 지하철광고, 옥상전광판, 디지털사이니지
// - 대행사: 수주, 캠페인, 신규 계약, MOU, 인수합병
// - 기획사: 광고 캠페인, 크리에이티브, 브랜드 사례
// - 광고주: 신제품 출시, 마케팅, 광고집행, 프로모션
// =============================================

export const OOH_SOURCES: RSSSourceConfig[] = [
  {
    name: 'OOH 매체사',
    nameEn: 'google_news_ooh_media',
    url: 'https://news.google.com/rss/search?q=%EC%98%A5%EC%99%B8%EA%B4%91%EA%B3%A0%20OR%20%EC%A0%84%EA%B4%91%ED%8C%90%20OR%20%EB%94%94%EC%A7%80%ED%84%B8%EC%82%AC%EC%9D%B4%EB%8B%88%EC%A7%80%20OR%20%EB%AF%B8%EB%94%94%EC%96%B4%ED%8F%B4%20OR%20%EB%B2%84%EC%8A%A4%EC%89%98%ED%84%B0%20OR%20%EC%98%A5%EC%83%81%EC%A0%84%EA%B4%91%ED%8C%90&hl=ko&gl=KR&ceid=KR:ko',
    category: 'domestic',
    subcategory: 'ooh_media',
    language: 'ko',
    icon: '🪧',
    fetchInterval: 3,
  },
  {
    name: 'OOH 대행사',
    nameEn: 'google_news_ooh_agency',
    url: 'https://news.google.com/rss/search?q=%EA%B4%91%EA%B3%A0%EB%8C%80%ED%96%89%EC%82%AC%20OR%20%EA%B4%91%EA%B3%A0%EC%88%98%EC%A3%BC%20OR%20%22%EA%B4%91%EA%B3%A0%20%EC%BA%A0%ED%8E%98%EC%9D%B8%22%20OR%20%22%EA%B4%91%EA%B3%A0%20%EA%B3%84%EC%95%BD%22%20OR%20%22%EC%98%A5%EC%99%B8%EA%B4%91%EA%B3%A0%20%EC%88%98%EC%A3%BC%22&hl=ko&gl=KR&ceid=KR:ko',
    category: 'domestic',
    subcategory: 'ooh_agency',
    language: 'ko',
    icon: '🤝',
    fetchInterval: 3,
  },
  {
    name: 'OOH 기획사',
    nameEn: 'google_news_ooh_planner',
    url: 'https://news.google.com/rss/search?q=%EA%B4%91%EA%B3%A0%EA%B8%B0%ED%9A%8D%20OR%20%ED%81%AC%EB%A6%AC%EC%97%90%EC%9D%B4%ED%8B%B0%EB%B8%8C%20OR%20%22%EB%B8%8C%EB%9E%9C%EB%93%9C%20%EC%BA%A0%ED%8E%98%EC%9D%B8%22%20OR%20%22%EA%B4%91%EA%B3%A0%20%EC%BA%A0%ED%8E%98%EC%9D%B8%22&hl=ko&gl=KR&ceid=KR:ko',
    category: 'domestic',
    subcategory: 'ooh_planner',
    language: 'ko',
    icon: '🎨',
    fetchInterval: 3,
  },
  {
    name: 'OOH 광고주',
    nameEn: 'google_news_ooh_advertiser',
    url: 'https://news.google.com/rss/search?q=%22%EC%8B%A0%EC%A0%9C%ED%92%88%20%EC%B6%9C%EC%8B%9C%22%20OR%20%22%EA%B4%91%EA%B3%A0%20%EC%A7%91%ED%96%89%22%20OR%20%ED%94%84%EB%A1%9C%EB%AA%A8%EC%85%98%20OR%20%22%EB%A7%88%EC%BC%80%ED%8C%85%20%EC%BA%A0%ED%8E%98%EC%9D%B8%22&hl=ko&gl=KR&ceid=KR:ko',
    category: 'domestic',
    subcategory: 'ooh_advertiser',
    language: 'ko',
    icon: '📣',
    fetchInterval: 3,
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
  ...OOH_SOURCES,
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
  ooh_media: '매체사',
  ooh_agency: '대행사',
  ooh_planner: '기획사',
  ooh_advertiser: '광고주',
}

// 카테고리 한글 매핑
export const CATEGORY_LABELS: Record<string, string> = {
  domestic: '국내 경제',
  overseas: '해외 경제',
  medical: '의료',
  smallbiz: '소상공인',
  all: '전체 뉴스',
}
