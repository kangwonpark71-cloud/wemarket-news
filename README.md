# economy-news

**v1.0.0+** — 경제/AI/IT 뉴스 애그리게이터.  
RSS 피드, Playwright 크롤러, 금융 데이터 API를 통합한 실시간 뉴스 수집 및 대시보드.

Next.js 16.2.10 + React 19 + Prisma (PostgreSQL) + Tailwind CSS v4

---

## Features

- **RSS 수집** — 한국경제, 매일경제 (국내) + 연준 6개 소스 (해외), 3시간 간격 스케줄러
- **AI/IT 뉴스** — 30+ 소스 (OpenAI, Anthropic, Google AI, TechCrunch 등), RSS + Playwright 크롤러, 15/30/60분 간격
- **AI 요약** — GPT-4o-mini 기반 뉴스 요약 + 규칙 기반 fallback
- **자동 번역** — 영문/일문/중문 기사 수집 후 제목·요약 자동 번역 (LLM 우선 + 규칙 fallback, 인메모리 큐 배치 처리)
- **금융 대시보드** — 국내 주식 (KOSPI/KOSDAQ), 암호화폐 (Upbit), 환율, 글로벌 지수
- **오늘의 경제 브리핑** — 지난 24시간 최다 조회 기사 기반 자동 큐레이션 (헤드라인 8 + 국내/해외/AI·IT 섹션 + 키워드 클라우드, 5분 캐시)
- **AI 뉴스 챗봇** — RAG 기반 기사 검색 + GPT 응답, 채팅 히스토리 저장
- **SSE 실시간 진행률** — 수집 상태를 브라우저에 실시간 스트리밍
- **웹훅 알림** — Discord/Slack 핫키워드 알림
- **다크모드** — 시스템 설정 연동 + 수동 전환 (FOUC 방지)
- **뉴스레터** — 이메일 구독/해지 (GET·POST), nodemailer 발송, 관리자 발송 대시보드
- **맞춤형 뉴스 다이제스트** — 관심 분야(7종)·키워드 기반 개인화 기사 선별, 매일 07:00 자동 발송
- **소셜 로그인** — Google/Kakao OAuth + 전화번호 가입 (scrypt, JWT)
- **PWA** — 오프라인 페이지, 서비스워커 캐싱, 설치 프롬프트, 모바일 하단 네비게이션, 웹 푸시 알림
- **검색** — 제목/내용 기반 뉴스 검색 + AI/IT 검색어 추천
- **추천 엔진** — 사용자 조회/북마크 기반 기사 추천
- **중복 병합** — 동일 주제 기사 자동 병합 (자동 병합 스케줄러)
- **캐시 무효화** — 키워드 알림/추천/인기 위젯 등 데이터 변경 시 캐시 자동 갱신
- **분산 락** — DB/Redis 기반 수집 중복 방지
- **가상 시황 엔진** — KIS API 장애 시 자체 시뮬레이션
- **날씨 위젯** — 기상청 실시간 날씨
- **배너/광고** — 위치 기반 광고 시스템
- **사용자 설정** — 전화번호 회원가입, 소스 숨기기/고정, 테마, 언어, 관심 분야
- **DB 백업** — `npm run db:backup` (PG `pg_dump` / SQLite 복사, 최근 14개 보존)
- **i18n/OOH 섹션** — 다국어 지원 프레임워크, 옥외광고(국내 4개 하위 카테고리) 전용 섹션

---

## Quick Start

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env.local
# DATABASE_URL, OPENAI_API_KEY, CRON_SECRET 등 설정

# 3. DB 설정 (SQLite 로컬 개발)
npm run db:dev:push
npm run db:seed

# 4. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

---

## Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | 개발 서버 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 시작 |
| `npm run lint` | ESLint 검사 |
| `npm run typecheck` | TypeScript 타입 검사 (`tsc --noEmit`) |

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Prisma 클라이언트 생성 (PG) |
| `npm run db:push` | PG 스키마 푸시 |
| `npm run db:dev:push` | SQLite 로컬 스키마 푸시 |
| `npm run db:dev:generate` | SQLite Prisma 클라이언트 생성 |
| `npm run db:seed` | RSS 소스 시드 데이터 추가 |
| `npm run db:studio` | Prisma Studio (데이터브라우저) |
| `npm run db:check:drift` | PG/SQLite 스키마 드리프트 검사 |
| `npm run db:backup` | DB 백업 (PG `pg_dump` / SQLite 복사, 14개 보존) |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Jest 단위 테스트 (399 tests, 29 suites) |
| `npm run test:watch` | Watch 모드 |
| `npm run test:coverage` | 커버리지 리포트 |
| `npm run test:e2e` | Playwright E2E 테스트 |

### Cron & Fetch

| Command | Description |
|---------|-------------|
| `npm run worker` | 독립형 cron 워커 실행 |
| `npm run fetch` | RSS 수집 트리거 (curl, dev 서버 필요) |
| `npm run dev:fetch` | dev-fetch 스크립트 실행 |

---

## Project Structure

```
economy-news/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 홈 (전체 뉴스)
│   │   ├── domestic/           # 국내 경제
│   │   ├── overseas/           # 해외 경제 (america/europe/asia)
│   │   ├── all/                # 전체 뉴스
│   │   ├── briefing/           # 오늘의 경제 브리핑
│   │   ├── ai-news/            # AI 뉴스
│   │   ├── it-news/            # IT 뉴스
│   │   ├── ooh/                # 옥외광고 뉴스
│   │   ├── articles/[id]/      # 기사 상세
│   │   ├── chat/               # AI 채팅 (RAG)
│   │   ├── admin/              # 관리자 페이지 (뉴스레터, 사용자 등)
│   │   ├── stocks/             # 주식 대시보드
│   │   ├── offline/            # PWA 오프라인 페이지
│   │   └── api/                # API 라우트 (26+개)
│   ├── components/             # UI 컴포넌트
│   │   ├── news/               # 뉴스 리스트, 카드, 인기 기사
│   │   ├── layout/             # 헤더, 사이드바, 모바일 네비, PWA
│   │   ├── dashboard/          # 금융 대시보드
│   │   ├── financial/          # 주식/환율 위젯
│   │   ├── ai-it/              # AI/IT 뉴스 컴포넌트
│   │   ├── chat/               # 챗봇 위젯
│   │   └── ui/                 # 공통 UI (뉴스레터, 배너 등)
│   └── lib/                    # 핵심 로직
│       ├── rss/                # RSS 피드 수집/파싱
│       ├── ai-it/              # AI/IT 뉴스 수집/요약/검색
│       ├── ai/                 # LLM 요약/번역
│       ├── services/           # 뉴스레터(+다이제스트), 챗, 브리핑, 캐시, 세션
│       ├── scheduler/          # 스케줄러 매니저 (RSS/AI-IT/금융/뉴스레터/다이제스트)
│       ├── utils/              # auth, rss-helper 등
│       ├── db.ts               # Prisma 클라이언트
│       └── logger.ts           # 구조화 로거
├── prisma/
│   ├── schema.prisma           # PG 스키마 (31 models)
│   ├── schema.sqlite.prisma    # SQLite 로컬 개발 스키마
│   └── seed.ts                 # 소스 시드 데이터
├── __tests__/                  # Jest 단위/통합 테스트 (29 suites)
├── e2e/                        # Playwright E2E
├── worker/                     # 독립형 cron 워커
└── scripts/                    # 유틸리티 (백업, 시드, 스크린샷 등)
```

### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/articles` | 뉴스 기사 목록 (필터/검색/페이지네이션) |
| `GET /api/articles/[id]` | 기사 상세 |
| `GET /api/articles/popular` | 인기 기사 (조회수 기반) |
| `GET /api/articles/recommendations` | 개인화 추천 기사 |
| `GET /api/articles/translate` | 기사 제목 on-demand 번역 |
| `GET /api/briefing` | 오늘의 경제 브리핑 (5분 캐시) |
| `GET /api/sources` | 뉴스 소스 목록 |
| `GET /api/stats` | 통계 (총 기사, 소스, 최근 수집) |
| `GET /api/health` | 헬스 체크 |
| `GET /api/fetch-logs` | 수집 로그 |
| `GET /api/fetch-stream` | SSE 실시간 수집 진행률 |
| `POST /api/cron` | RSS 수집 트리거 |
| `GET /api/financial/...` | 금융 데이터 (주식, 암호화폐, 환율, 글로벌) |
| `GET /api/weather` | 날씨 정보 |
| `GET /api/ai-it/...` | AI/IT 뉴스 및 요약 |
| `POST /api/chat` | AI 챗봇 (RAG) 질문 |
| `POST /api/newsletter/subscribe` | 뉴스레터 구독 (관심 분야/키워드 포함) |
| `POST|GET /api/newsletter/unsubscribe` | 뉴스레터 해지 |
| `GET /api/auth/...` | 인증 (전화번호, Google/Kakao OAuth 콜백) |
| `GET /api/admin/...` | 관리자 API (뉴스레터 발송, 다이제스트 발송 등) |
| `GET /api/push/...` | PWA 푸시 알림 |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL 연결 문자열 (로컬은 SQLite) |
| `CRON_SECRET` | ✅ | — | cron API 인증 시크릿 |
| `OPENAI_API_KEY` | ❌ | — | GPT-4o-mini 요약/번역/챗봇용 (없으면 규칙 기반) |
| `REDIS_URL` | ❌ | — | Redis 캐시 (없으면 in-memory fallback) |
| `NEXT_PUBLIC_APP_URL` | ❌ | `http://localhost:3000` | 앱 공개 URL |
| `SMTP_HOST` | ❌ | — | 뉴스레터 발송 SMTP 서버 (설정 시 스케줄러 활성화) |
| `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | ❌ | `587` / — / — | SMTP 인증 정보 |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_SERVICE_SID` | ❌ | — | 전화번호 인증 (없으면 mock 코드) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ❌ | — | Google OAuth |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | ❌ | — | Kakao OAuth |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | ❌ | — | PWA 웹 푸시 알림 |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.2.10 (App Router) |
| **UI** | React 19, Tailwind CSS v4, Recharts |
| **Database** | PostgreSQL (prod) / SQLite (dev), Prisma ORM (31 models) |
| **Caching** | Redis (ioredis) + in-memory fallback |
| **AI** | OpenAI GPT-4o-mini (요약/번역/RAG 챗봇) |
| **Crawling** | Playwright, Cheerio |
| **Auth** | 전화번호 (Twilio) + Google/Kakao OAuth, scrypt, JWT |
| **Email** | nodemailer (뉴스레터, 맞춤형 다이제스트) |
| **Push** | web-push (PWA) |
| **Testing** | Jest (399 tests, 29 suites), Playwright (E2E) |
| **CI** | GitHub Actions (lint → typecheck → test → coverage) |
| **Deploy** | Railway (Nixpacks) |
| **Runtime** | Node 22+, npm |

---

## Architecture

- **수집 파이프라인**: Source → RSS/Crawler → Article → Summary/Translation (통합 Article/Source 테이블, `sourceType` 구분)
- **스케줄러**: node-cron 기반 `scheduler-manager`, RSS(3h)/AI·IT(15·30·60m)/금융/중복병합/뉴스레터(08:00)/다이제스트(07:00), 분산 락으로 중복 방지
- **번역 파이프라인**: 수집 완료 후 인메모리 큐 드레인 → `translateArticleBatch` (LLM 우선 + 규칙 fallback)
- **캐시 계층**: Redis 우선, 장애 시 in-memory fallback, 60s-24h TTL, 데이터 변경 시 패턴 기반 무효화
- **뉴스레터**: nodemailer + `{{email}}` 개인화 치환, 구독자별 맞춤 다이제스트 (관심 분야·키워드 스코어링)
- **알림**: Webhook (Discord/Slack) 핫키워드 감지 + PWA 웹 푸시
- **SSE**: fetchProgressPubSub 패턴으로 실시간 수집 상태 브로드캐스트

---

## Testing

```bash
# 전체 단위 테스트
npm test                    # 399 tests, 29 suites ✅

# 커버리지
npm run test:coverage

# 타입 체크
npm run typecheck

# Lint
npm run lint

# E2E (로컬 dev 서버 필요)
npm run test:e2e
```

---

## License

MIT
