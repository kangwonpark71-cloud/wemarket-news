# Economy News — 데이터베이스 스키마 참조

> **목적**: AI가 Prisma 스키마를 다시 읽지 않고 빠르게 참조하기 위한 문서  
> **마지막 갱신**: 2026-07-30  
> **프로덕션**: PostgreSQL (`prisma/schema.prisma`)  
> **로컬**: SQLite (`prisma/schema.sqlite.prisma`)

---

## 모델 전체 맵 (20 models)

```
Source ──┬── Article ──┬── NewsSummary
          │            ├── NewsTagRelation ── NewsTag
          │            └── NewsCategory (AI/IT only, optional)
          │
          └── FetchLog

User ─── UserPreference
     └── PushSubscription

Banner
Advertisement
NewsletterSubscription

Stock ─── StockPrice
StockDailyStat
StockWatchlist

Cryptocurrency ─┬── CryptoTicker
               └── CryptoCandle
CryptoDailyStat

ExchangeRate
ExchangeRateDailyStat

GlobalIndex ─── GlobalIndexQuote
PriceHistory

FinancialFetchLog
DistributedLock

--- Phase 6 추가 ---
SocialAccount (예정)
ChatMessage (예정)
```

---

## 모델 상세

### Source — 수집 채널
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| name | String | "한국경제", "OpenAI Blog" |
| nameEn | String (unique) | "hankyung", "openai_blog" |
| url | String (unique) | RSS URL |
| sourceType | SourceType (RSS\|AI_IT) | 채널 구분 |
| category | String | domestic\|overseas\|ai\|it |
| subcategory | String? | korean_economy, official_ai 등 |
| language | String (default: "ko") | "ko"\|"en" |
| icon | String? | 소스 아이콘 URL |
| isActive | Boolean (default: true) | 활성화 상태 |
| fetchInterval | Int (default: 3) | RSS: 시간, AI/IT: 분 |
| fetchType | String (default: "rss") | "rss"\|"crawler" |
| crawlerConfig | Json? | 크롤러 설정 |

인덱스: `[sourceType, isActive]`, `[category, isActive]`

### Article — 통합 뉴스 기사 (RSS + AI/IT)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| sourceId | String → Source.id | FK |
| sourceType | SourceType (RSS\|AI_IT) | RSS 또는 AI/IT |
| categoryId | String? → NewsCategory.id | AI/IT 전용 카테고리 |
| guid | String? | RSS GUID (중복방지) |
| title | String | 기사 제목 |
| url | String (unique) | 원문 URL |
| description | String? | 요약/설명 |
| content | String? (@db.Text) | 전체 본문 |
| translatedContent | String? (@db.Text) | 한국어 번역본 |
| author | String? | 저자 |
| thumbnail | String? | 썸네일 URL |
| publishedAt | DateTime | 발행일시 |
| fetchedAt | DateTime (now()) | 수집일시 |
| category | String? | RSS category (Fed) |
| language | String (default: "ko") | "ko"\|"en" |
| isRead | Boolean (false) | 읽음 여부 |
| isBookmarked | Boolean (false) | 북마크 |
| viewCount | Int (0) | 조회수 |
| keywords | String ("") | 쉼표구분 키워드 |
| isBreaking | Boolean (false) | 속보 |

관계: Source, NewsCategory?, NewsTagRelation[], NewsSummary?
인덱스: `[sourceType, publishedAt]`, `[sourceId, publishedAt]`, `[category, publishedAt]`, `[language, publishedAt]`, `[publishedAt]`

### FetchLog — 수집 로그
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| sourceId | String → Source.id | FK |
| status | String | success\|error\|partial |
| count | Int (0) | 총 기사 수 |
| newCount | Int (0) | 신규 기사 수 |
| error | String? | 에러 메시지 |
| duration | Int? | 소요시간 (ms) |
| fetchedAt | DateTime (now()) | 수집시각 |

인덱스: `[sourceId, fetchedAt]`

### User — 사용자
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| email | String? (unique) | 이메일 |
| password | String | scrypt 해시 |
| name | String? | 이름 |
| role | UserRole (USER\|ADMIN) | 권한 |
| phone | String? | 휴대폰 (회원가입 필수) |
| phoneVerified | Boolean (false) | 전화 인증 |
| emailVerified | Boolean (false) | 이메일 인증 |
| gender | String? | 성별 |
| birthDate | DateTime? | 생년월일 |

관계: UserPreference?, PushSubscription?

### UserPreference — 사용자 설정
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| userId | String (unique) → User.id | FK |
| hiddenSources | String ("") | 숨긴 소스 IDs (쉼표구분) |
| pinnedSources | String ("") | 고정 소스 IDs |
| theme | String ("light") | light\|dark\|system |
| language | String ("all") | 언어 필터 |
| interests | String ("") | 관심분야 IDs |
| alertKeywords | String ("") | 키워드 알림 (쉼표구분) |

### PushSubscription — Push 알림 구독
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| userId | String (unique) → User.id | FK |
| endpoint | String (unique) | Web Push endpoint |
| keysP256dh | String | DH 키 |
| auth | String | Auth 키 |

### NewsletterSubscription — 뉴스레터 구독
| 필드 | 타입 | 설명 |
|---|---|---|
| id | String (uuid) | PK |
| email | String (unique) | 구독 이메일 |
| isActive | Boolean (true) | 활성 상태 |
| createdAt | DateTime | 구독일 |

---

## 금융 모델

### Stock — 주식 종목 마스터
| 필드 | 타입 | 설명 |
|---|---|---|
| code | String (unique) | 종목코드 (005930) |
| name | String | 삼성전자 |
| market | String | KOSPI\|KOSDAQ\|KOSPI200 |
| sector | String? | 업종 |
| industry | String? | 산업 |

### StockPrice — 주식 현재가
| 필드 | 타입 | 설명 |
|---|---|---|
| stockId → Stock.id | | FK |
| price | Decimal(20,2) | 현재가 |
| changeRate | Decimal(10,4) | 등락률 |
| volume | BigInt | 거래량 |
| marketCap | Decimal(30,2)? | 시가총액 |

### Cryptocurrency — 암호화폐 마스터
| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | String (unique) | BTC, ETH |
| name | String | Bitcoin |
| market | String (default: "UPBIT") | 거래소 |

### CryptoTicker — 암호화폐 현재가
| 필드 | 타입 | 설명 |
|---|---|---|
| cryptoId → Cryptocurrency.id | | FK |
| tradePrice | Decimal(30,8) | 현재가 |
| signedChangeRate | Decimal(10,6) | 등락률 |
| accTradePrice24h | Decimal(30,2) | 24시간 거래대금 |

### CryptoCandle — 캔들차트
| 필드 | 타입 | 설명 |
|---|---|---|
| cryptoId → Cryptocurrency.id | | FK |
| unit | String | minutes/1, minutes/5, ..., days |
| tradePrice | Decimal(30,8) | 종가 |
| unique | [cryptoId, unit, timestamp] | |

### ExchangeRate — 환율
| 필드 | 타입 | 설명 |
|---|---|---|
| baseCurrency | String | USD, JPY, EUR, CNY |
| quoteCurrency | String (default: "KRW") | |
| rate | Decimal(20,6) | 현재 환율 |
| unique | [baseCurrency, quoteCurrency, timestamp] | |

### GlobalIndex — 글로벌 지수
| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | String (unique) | ^DJI, ^IXIC, ^GSPC |
| name | String | Dow Jones |
| country | String (default: "US") | |

### GlobalIndexQuote — 지수 현재가
| 필드 | 타입 | 설명 |
|---|---|---|
| indexId → GlobalIndex.id | | FK |
| price | Decimal(20,4) | |
| changeRate | Decimal(10,6) | |

### PriceHistory — 차트 히스토리 (범용)
| 필드 | 타입 | 설명 |
|---|---|---|
| symbol | String | 종목 심볼 |
| type | String | STOCK\|CRYPTO\|INDEX\|FOREX |
| timeframe | String | 1m, 5m, 1d, 1w 등 |
| unique | [symbol, type, timeframe, timestamp] | |

---

## 유틸리티 모델

### Banner — 배너
| 필드 | 설명 |
|---|---|
| position | top\|sidebar\|bottom |
| sortOrder | 노출 순서 |

### Advertisement — 광고
| 필드 | 설명 |
|---|---|
| adType | image\|text\|html |
| content | URL, 텍스트, 또는 HTML |
| position | sidebar\|in-content\|header\|footer |

### DistributedLock — 분산 락 (DB 기반)
| 필드 | 설명 |
|---|---|
| lockName | unique |
| owner | 락 소유자 |
| expiresAt | 만료시각 |

### FinancialFetchLog — 금융 수집 로그
| 필드 | 설명 |
|---|---|
| service | STOCK\|CRYPTO\|FOREX\|GLOBAL_INDEX |
| endpoint | API 엔드포인트 |

### StockDailyStat — 주식 일별 통계
### StockWatchlist — 관심종목
### CryptoTicker — 암호화폐 티커
### CryptoDailyStat — 암호화폐 일별 통계
### ExchangeRateDailyStat — 환율 일별 통계

---

## 인덱스 요약

| 테이블 | 인덱스 | 용도 |
|---|---|---|
| Source | [sourceType, isActive] | 소스 타입별 필터링 |
| Source | [category, isActive] | 카테고리별 필터링 |
| Article | [sourceType, publishedAt DESC] | 타입별 최신 기사 |
| Article | [sourceId, publishedAt DESC] | 특정 소스별 기사 |
| Article | [category, publishedAt DESC] | 카테고리별 기사 |
| Article | [language, publishedAt DESC] | 언어별 필터링 |
| Article | [publishedAt DESC] | 전체 최신순 |
| FetchLog | [sourceId, fetchedAt DESC] | 소스별 수집 이력 |
| StockPrice | [stockId, timestamp DESC] | 최신 시세 |
| CryptoTicker | [cryptoId, timestamp DESC] | 최신 티커 |
| CryptoCandle | [cryptoId, unit, timestamp DESC] | 차트 조회 |
| PriceHistory | [symbol, type, timeframe, timestamp] | 범용 차트 |
| NewsTagRelation | [articleId], [tagId] | 태그-기사 조인 |

---

## SQLite vs PostgreSQL 차이점

PostgreSQL 스키마 (`schema.prisma`)가 기준이며, SQLite 스키마 (`schema.sqlite.prisma`)는 스크립트로 생성됨.

| 차이점 | PostgreSQL | SQLite |
|---|---|---|
| Array | `String[]` (기본 지원) | `String` + parseList() 함수로 처리 |
| Decimal | `@db.Decimal(20,2)` | `Float` |
| BigInt | 지원 | 지원 |
| @db.Text | 지원 | 지원 안함 → `String` |
| @db.Date | 지원 | 지원 안함 → `DateTime` |
| Json | 지원 | 지원 안함 → `String` |

### Array 파서 (SQLite 호환용)
```typescript
// src/lib/utils/list-fields.ts
export function parseList(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function stringifyList(value: string[] | null | undefined): string {
  if (!value || value.length === 0) return '';
  return value.join(',');
}
```
