# Economy News - AGENTS.md

## Next.js Version Warning
This project uses **Next.js 16.2.10** and **React 19.2.4**. Read `node_modules/next/dist/docs/` before making any changes — there are breaking changes from earlier versions.

## Project Structure

```
economy-news/
├── src/
│   ├── app/                 # Next.js App Router pages & API
│   │   ├── api/
│   │   │   ├── cron/        # RSS fetch trigger (POST)
│   │   │   ├── articles/    # CRUD articles, bookmark, read
│   │   │   ├── sources/     # source listing
│   │   │   ├── ai-it/       # AI/IT news endpoints
│   │   │   ├── financial/   # stocks, crypto, forex, global
│   │   │   └── health/      # health check
│   │   ├── (page)/          # domestic, overseas, all, ai-news, it-news, stocks
│   │   └── layout.tsx       # root layout
│   ├── components/
│   │   ├── news/            # NewsCard, NewsList
│   │   ├── ai-it/           # AI/IT specific components
│   │   ├── financial/       # Financial market components
│   │   ├── layout/          # Header, Sidebar, HeaderWrapper
│   │   └── ui/              # Reusable UI (MarkdownRenderer, RefreshButton)
│   └── lib/
│       ├── rss/             # RSS feed system (RSS parser + content scraping)
│       │   ├── sources.ts   # RSS source definitions (hankyung, mk, fed)
│       │   ├── fetcher.ts   # RSS feed fetching with retry logic
│       │   ├── db-service.ts # CRUD for RSS articles, stats
│       │   ├── content-scraper.ts # Cheerio-based article content extraction
│       │   ├── scheduler.ts # Cron trigger for RSS (3-hour intervals)
│       │   └── service.ts   # Source seeding, logging
│       ├── ai-it/           # AI/IT news system (separate from RSS)
│       │   ├── sources.ts   # 30+ source definitions (OpenAI, TechCrunch, etc.)
│       │   ├── fetcher.ts   # RSS + Playwright crawler dispatcher
│       │   ├── playwright-crawler.ts # Playwright-based web crawler
│       │   ├── db-service.ts # CRUD for AI/IT articles, summaries, tags
│       │   ├── search-service.ts # Full-text search, suggestions, trends
│       │   ├── summary-service.ts # AI/rule-based article summarization
│       │   └── scheduler-service.ts # 15/30/60 min fetch intervals
│       ├── services/        # Financial services
│       │   ├── financial/   # Financial data service
│       │   ├── crypto/      # Cryptocurrency service
│       │   ├── market/      # Market data
│       │   ├── cache/       # Redis/ioredis caching
│       │   └── scheduler/   # Scheduler service (node-cron)
│       └── db.ts            # Prisma singleton
├── prisma/
│   └── schema.prisma        # 20 models: Source, Article, NewsSource, NewsArticle, Stock, Cryptocurrency, etc.
├── e2e/                     # Playwright E2E tests
├── __tests__/               # Jest unit tests
├── worker/                  # Standalone cron worker
├── railway.json             # Railway deployment config
└── nixpacks.toml            # Nixpacks build config
```

## Environments

| Environment | DB | Run command |
|---|---|---|
| Local dev | SQLite | `npm run dev` (uses .env.local) |
| Production | PostgreSQL | `npm start` (uses .env/railway.json preDeploy) |

## Prisma DB Schema Architecture

The schema is **unified**, not three separate silos. Defined in `prisma/schema.prisma` (PostgreSQL, production) with a parallel `prisma/schema.sqlite.prisma` (SQLite, local dev — see Drift Risk below).

1. **News system (shared)** — `Source` + `Article` + `FetchLog`. A single `Article`/`Source` pair serves BOTH pipelines, distinguished by `Source.sourceType` (`RSS` | `AI_IT`). AI/IT-only辅助 tables (`NewsCategory`, `NewsTag`, `NewsTagRelation`, `NewsSummary`) reference `Article` by id. RSS and AI/IT queries are the same tables filtered by `sourceType`, NOT separate models.
2. **User system** — `User`, `UserPreference`, `Banner`, `Advertisement`, `NewsletterSubscription`.
3. **Financial system** (separate domain models) — `Stock`, `StockPrice`, `Cryptocurrency`, `CryptoTicker`, `CryptoCandle`, `ExchangeRate`, `GlobalIndex`, `PriceHistory`, `FinancialFetchLog`, `DistributedLock`. These do not share rows with the news tables but live in the same database and use the same Prisma client.

> **Drift risk**: `prisma/schema.prisma` (prod/PG) and `prisma/schema.sqlite.prisma` (dev/SQLite) are maintained separately. Any model change must be applied to BOTH and regeneration run for each (`npm run db:generate` for PG, `npm run db:dev:generate` for SQLite) — otherwise dev and prod schemas diverge.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (flat config, eslint.config.mjs) |
| `npm test` | Jest unit tests |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:headed` | Playwright headed mode |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB |
| `npm run db:migrate` | Prisma migration dev |
| `npm run db:seed` | Seed sources (tsx prisma/seed.ts) |
| `npm run db:studio` | Prisma Studio |
| `npm run worker` | Standalone RSS cron worker |
| `npm run dev:fetch` | Dev fetch (tsx scripts/dev-fetch.ts) |
| `npm run dev:fetch:source` | Dev fetch single source |
| `npm run fetch` | Trigger RSS fetch (curl to /api/cron) |

## API Reference

### RSS News

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/articles` | List articles (query: category, source, page, limit, search, sortBy, sortOrder) |
| GET | `/api/articles/[id]` | Get single article |
| GET | `/api/stats` | Article/source statistics |
| GET | `/api/sources` | List sources (?logs=true for fetch logs) |
| GET | `/api/fetch-logs` | Recent fetch logs |
| POST | `/api/cron` | Trigger RSS fetch (requires CRON_SECRET) |
| GET | `/api/dev/fetch` | Dev-only fetch trigger (no auth, dev only) |
| GET | `/api/fetch-stream` | SSE endpoint for real-time fetch progress |

### AI/IT News

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/ai-it/articles` | List AI/IT articles (query: category, subcategory, page, search, dateFrom, dateTo) |
| POST | `/api/ai-it/fetch` | Trigger AI/IT fetch (?action=all\|category\|source\|15min\|30min\|60min) |
| POST | `/api/ai-it/trigger` | Seed + fetch AI/IT sources (requires CRON_SECRET) |
| GET | `/api/ai-it/stats` | AI/IT articles/sources statistics |
| POST | `/api/ai/summarize` | LLM article summary |

### Financial Data

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/financial/dashboard` | KOSPI/KOSDAQ/BTC/ETH/USD/NASDAQ overview (cached 60s) |
| GET | `/api/financial/overview` | Full market overview + stats (cached 60s) |
| GET | `/api/financial/stocks` | Stock prices & details |
| GET | `/api/financial/crypto` | Crypto tickers & candles |
| GET | `/api/financial/forex` | Exchange rates |
| GET | `/api/financial/global` | Global indices |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |

## Development Setup

```bash
npm install                  # Install deps + runs prisma generate
cp .env.local.example .env.local  # Use SQLite for local dev
npm run db:push              # Create tables
npm run db:seed              # Seed RSS sources
npm run db:studio            # (optional) view data
npm run dev                  # Start
```

## Testing Quirks

- **E2E tests** (Playwright): Tests expect a running app at localhost:3000. The config auto-starts a dev server.
- **E2E API tests** (`app.spec.ts`): Tests are order-dependent on prior data existing. Some tests pass vacuously (e.g., "either articles exist or empty state is shown").
- **Jest tests**: Only cover utility functions (`__tests__/utils.test.ts`). No tests exist for the AI/IT system or Playwright crawler.
- **Crawler tests** (`crawler.spec.ts`): Validate config structure only, not actual crawling.

## Import Convention

The project uses `@/` path alias for `./src/` (defined in tsconfig.json paths). Use `@/lib/...` or `@/components/...` in app code. Inside `src/`, relative imports are also used.

## Crafting Conventions

- Use ES modules (import/export). No require in app code.
- CSS: Tailwind CSS v4 with PostCSS.
- Prisma: Use async/await and try-catch for DB operations.
- Error handling: Return `{ success, data }` from API routes, never throw directly.
- No ORM raw queries; all interactions through Prisma client.

## Records to Know

### Recent Architectural Changes (July 2026)

1. **Scheduler 통합** (`src/lib/startup/schedulers.ts`): RSS + AI/IT + 금융 스케줄러를 하나의 `startAllSchedulers()`에서 관리.
   - RSS: 3시간 간격 (node-cron) + 서버 시작 2초 후
   - AI/IT: 15/30/60분 간격 (node-cron) + 서버 시작 5초 후
   - 금융: `SchedulerService` (setTimeout 기반, 주식 5분/코인 1분/환율 30분 등)

2. **AI/IT 단일화 테이블 전환**: `NewsArticle`/`NewsSource`/`NewsFetchLog` → 통합 `Article`/`Source`/`FetchLog` 테이블로 단일화.
   - 모든 데이터는 통합 테이블에만 저장
   - AI/IT 전용 쿼리는 `sourceType: 'AI_IT'` 필터로 처리
   - `NewsTag`, `NewsTagRelation`, `NewsSummary`, `NewsCategory`는 그대로 유지 (Article 테이블 참조)

3. **SSE 실시간 Fetch 진행률**: `/api/fetch-stream` SSE 엔드포인트 + `FetchStatusBar` UI 컴포넌트.
   - `fetchProgressPubSub`를 통해 수집 진행상황 실시간 전송
   - 진행률 바 + 완료 팝업 (8초 후 자동 소멸)

4. **AI 요약 LLM 우선**: `generateAISummaryWithLLM`을 기본 요약 엔진으로 사용 (GPT-4o-mini → 실패 시 규칙 기반 fallback).

5. **다크모드**: `ThemeToggle` 컴포넌트 (light/dark/system 순환), FOUC 방지 스크립트, `localStorage` 영구 저장.

6. **Redis 캐싱**: `financial/dashboard` 및 `financial/overview`에 60초 TTL 캐싱 적용.

### 기타

- The Playwright crawler (`src/lib/ai-it/playwright-crawler.ts`) is a separate tool from the RSS fetcher.
- The `summary-service.ts` has both rule-based (`generateAISummary`) and LLM-first (`generateAISummaryWithLLM`) paths.
- The `worker/index.ts` is a standalone script for running RSS backend in server deployments.
- The `healthcheckPath` in production is `/api/health`.
- Cache service (`cache-service.ts`): Redis with in-memory fallback. Financial data uses pre-defined `CacheTTL` constants.
