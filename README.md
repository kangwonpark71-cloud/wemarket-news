# economy-news

**v1.0.0** — 경제/AI/IT 뉴스 애그리게이터.  
RSS 피드, Playwright 크롤러, 금융 데이터 API를 통합한 실시간 뉴스 수집 및 대시보드.

Next.js 16.2.10 + React 19 + Prisma (PostgreSQL) + Tailwind CSS v4

---

## Features

- **RSS 수집** — 한국경제, 매일경제 (국내) + 연준 6개 소스 (해외)
- **AI/IT 뉴스** — 30+ 소스 (OpenAI, Anthropic, Google AI, TechCrunch 등), RSS + Playwright 크롤러
- **AI 요약** — GPT-4o-mini 기반 뉴스 요약 + 규칙 기반 fallback
- **금융 대시보드** — 국내 주식 (KOSPI/KOSDAQ), 암호화폐 (Upbit), 환율, 글로벌 지수
- **SSE 실시간 진행률** — 수집 상태를 브라우저에 실시간 스트리밍
- **웹훅 알림** — Discord/Slack 핫키워드 알림
- **다크모드** — 시스템 설정 연동 + 수동 전환 (FOUC 방지)
- **뉴스레터** — 이메일 구독 수집
- **검색** — 제목/내용 기반 뉴스 검색
- **분산 락** — DB/Redis 기반 수집 중복 방지
- **가상 시황 엔진** — KIS API 장애 시 자체 시뮬레이션
- **날씨 위젯** — 기상청 실시간 날씨
- **배너/광고** — 위치 기반 광고 시스템
- **사용자 설정** — 전화번호 회원가입, 소스 숨기기, 테마, 언어

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

### Database

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Prisma 클라이언트 생성 (PG) |
| `npm run db:push` | PG 스키마 푸시 |
| `npm run db:dev:push` | SQLite 로컬 스키마 푸시 |
| `npm run db:dev:generate` | SQLite Prisma 클라이언트 생성 |
| `npm run db:seed` | RSS 소스 시드 데이터 추가 |
| `npm run db:studio` | Prisma Studio (데이터브라우저) |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Jest 단위 테스트 (73 tests, 8 suites) |
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
│   │   ├── page.tsx            # 홈 (국내 경제)
│   │   ├── overseas/           # 해외 경제
│   │   ├── all/                # 전체 뉴스
│   │   ├── ai-news/            # AI 뉴스
│   │   ├── it-news/            # IT 뉴스
│   │   ├── articles/[id]/      # 기사 상세
│   │   ├── admin/              # 관리자 페이지
│   │   ├── stocks/             # 주식 대시보드
│   │   └── api/                # API 라우트 (13개)
│   ├── components/             # UI 컴포넌트
│   │   ├── news/               # 뉴스 리스트, 카드
│   │   ├── layout/             # 헤더, 사이드바, 배너
│   │   ├── dashboard/          # 금융 대시보드
│   │   ├── financial/          # 주식/환율 위젯
│   │   ├── ai-it/              # AI/IT 뉴스 컴포넌트
│   │   └── ui/                 # 공통 UI (버튼, 입력 등)
│   └── lib/                    # 핵심 로직
│       ├── rss/                # RSS 피드 수집/파싱
│       ├── ai-it/              # AI/IT 뉴스 수집/요약
│       ├── services/           # 서비스 (scheduler, auth, cache)
│       ├── sse/                # SSE 실시간 푸시
│       ├── db.ts               # Prisma 클라이언트
│       └── utils.ts            # 공통 유틸리티
├── prisma/
│   ├── schema.prisma           # PG 스키마 (449 lines, 16+ models)
│   └── seed.ts                 # 소스 시드 데이터
├── __tests__/                  # 통합/루트 레벨 테스트
├── e2e/                        # Playwright E2E
├── worker/                     # 독립형 cron 워커
└── scripts/                    # 유틸리티 스크립트
```

### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/articles` | 뉴스 기사 목록 (필터/검색/페이지네이션) |
| `GET /api/sources` | 뉴스 소스 목록 |
| `GET /api/stats` | 통계 (총 기사, 소스, 최근 수집) |
| `GET /api/health` | 헬스 체크 |
| `GET /api/fetch-logs` | 수집 로그 |
| `GET /api/fetch-stream` | SSE 실시간 수집 진행률 |
| `POST /api/cron` | RSS 수집 트리거 |
| `GET /api/financial/...` | 금융 데이터 (주식, 암호화폐, 환율) |
| `GET /api/weather` | 날씨 정보 |
| `GET /api/ai-it/...` | AI/IT 뉴스 및 요약 |
| `GET /api/admin/...` | 관리자 API |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL 연결 문자열 |
| `CRON_SECRET` | ✅ | — | cron API 인증 시크릿 |
| `OPENAI_API_KEY` | ❌ | — | GPT-4o-mini 요약용 (없으면 규칙 기반) |
| `REDIS_URL` | ❌ | — | Redis 캐시 (없으면 in-memory fallback) |
| `NEXT_PUBLIC_APP_URL` | ❌ | `http://localhost:3000` | 앱 공개 URL |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.2.10 (App Router) |
| **UI** | React 19, Tailwind CSS v4, Recharts |
| **Database** | PostgreSQL (prod) / SQLite (dev), Prisma ORM |
| **Caching** | Redis (ioredis) + in-memory fallback |
| **AI** | OpenAI GPT-4o-mini (요약) |
| **Crawling** | Playwright, Cheerio |
| **Auth** | 전화번호 기반 (SMS) |
| **Testing** | Jest (73 tests), Playwright (E2E) |
| **CI** | GitHub Actions (lint → typecheck → test → coverage) |
| **Deploy** | Railway (Nixpacks) |
| **Runtime** | Node 22+, npm |

---

## Architecture

- **수집 파이프라인**: Source → RSS/Crawler → Article → Summary
- **스케줄러**: node-cron 기반, 소스별 수집 주기 관리, 분산 락으로 중복 방지
- **캐시 계층**: Redis 우선, 장애 시 in-memory fallback, 60s-24h TTL
- **알림**: Webhook (Discord/Slack) 핫키워드 감지
- **SSE**: fetchProgressPubSub 패턴으로 실시간 수집 상태 브로드캐스트

---

## Testing

```bash
# 전체 단위 테스트
npm test                    # 73 tests, 8 suites ✅

# 커버리지
npm run test:coverage

# E2E (로컬 dev 서버 필요)
npm run test:e2e
```

---

## License

MIT
