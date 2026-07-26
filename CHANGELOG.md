# Changelog

## v1.0.0 (2026-07-26)

### 🚀 Initial Release — 경제뉴스 뉴스 애그리게이터

Economy News is a comprehensive news aggregator that collects, summarizes, and displays economic, AI, and IT news from 40+ sources with real-time financial market data.

### Features

#### 📰 News Aggregation
- **RSS 수집**: 한국경제, 매일경제, 연준(Fed) 등 6개 국내외 경제 뉴스 RSS 피드 수집 (3시간 간격 자동 수집)
- **AI/IT 뉴스**: OpenAI, Anthropic, Google AI, TechCrunch 등 30+ 소스 RSS + Playwright 크롤러 수집 (15/30/60분 간격)
- **통합 아키텍처**: RSS + AI/IT 뉴스를 통합 Article/Source 테이블에서 관리 (sourceType 구분)
- **AI 요약**: GPT-4o-mini 기반 3줄 요약 + 키워드 추출 + 난이도 분류 (API 실패 시 규칙 기반 fallback)
- **자동 번역**: 영문 기사 한국어 요약 자동 생성

#### 💹 금융 대시보드
- **국내 주식**: KOSPI/KOSDAQ 실시간 지수 + 종목별 가격 (KIS API, 5분 갱신)
- **암호화폐**: Upbit 30종 목록 + 실시간 시세/캔들차트 (1분 갱신)
- **환율**: USD/KRW 등 주요 환율 (30분 갱신)
- **글로벌 지수**: 나스닥, S&P 500, 다우존스, 니케이 등 (1시간 갱신)
- **가상 시황 엔진**: KIS API 장애 시 시뮬레이션 모드 fallback
- **Redis 캐싱**: 60초 TTL 캐싱으로 금융 데이터 성능 최적화

#### 🎨 UI/UX
- **다크모드**: 시스템 설정 연동 + 수동 전환 (FOUC 방지 스크립트)
- **반응형 디자인**: Tailwind CSS v4, 모바일/태블릿/데스크톱 대응
- **무한 스크롤**: IntersectionObserver 기반 NewsList 컴포넌트
- **SSE 실시간 진행률**: 수집 상태 브라우저 실시간 스트리밍
- **카테고리별 뷰**: 국내/해외/AI/IT/전체/정치/사회/문화/연예/스포츠
- **검색**: 키워드 기반 통합 검색 (국내 + AI/IT)

#### 🔐 시스템
- **스케줄러 통합**: RSS + AI/IT + 금융 스케줄러 단일 `startAllSchedulers()` 관리
- **분산 락**: DB 기반 수집 중복 방지
- **웹훅 알림**: Discord/Slack 핫키워드 알림
- **사용자 설정**: 전화번호 회원가입, 소스 숨기기, 테마, 언어
- **뉴스레터**: 이메일 구독 수집
- **배너/광고**: 위치 기반 광고 시스템
- **날씨 위젯**: 기상청 실시간 날씨

### 🧪 Testing
- **Jest**: 200개 단위/통합 테스트 (19 suites)
- **Playwright**: E2E 브라우저 테스트
- **커버리지**: 핵심 모듈 85-100% (전체 54.5%)

### 🏗 인프라
- **배포**: Railway (Nixpacks builder)
- **데이터베이스**: PostgreSQL (prod) / SQLite (dev)
- **CI**: GitHub Actions (lint → typecheck → test → coverage)
- **Node.js**: 22+

### 🐛 Bug Fixes (v1.0.0 RC)
- Empty catch block in layout.tsx FOUC script — added explanatory comment
- Unsafe type assertions (`as unknown`/`as any`) in db-service.ts, translation-service.ts, search page
- Translation queue memory leak — added 5000-entry max bound to `englishArticleIds[]`
- Missing `typecheck` npm script added

### 📦 Dependencies
- Next.js 16.2.10, React 19.2.4
- Prisma 6.19.3 (PostgreSQL + SQLite)
- Tailwind CSS v4
- Recharts for financial charts
- OpenAI GPT-4o-mini for AI summaries
- Playwright + Cheerio for crawling
- Redis (ioredis) for caching
- Twilio for SMS auth
