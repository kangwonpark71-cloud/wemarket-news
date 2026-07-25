# Handoff — economy-news v1.0.0

## Project Overview

Korean/English economic news aggregator with RSS collection, AI/IT crawling, financial dashboard, and AI-powered summaries. Deployed on Railway.

| Field | Value |
|---|---|
| **Stack** | Next.js 16.2.10, React 19.2.4, TypeScript, Prisma, Tailwind CSS v4 |
| **Database** | PostgreSQL (prod) / SQLite (dev) |
| **Cache** | Redis (optional, in-memory fallback) |
| **Deployment** | Railway (Nixpacks) |
| **CI/CD** | GitHub Actions (lint → typecheck → test → coverage) |
| **Tests** | 8 suites, 73 unit tests (Jest), E2E via Playwright |

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run dev
```

## Key Directories

| Path | Purpose |
|---|---|
| `src/lib/services/` | Financial/crypto/market services, scheduler, cache |
| `src/lib/ai-it/` | AI/IT news fetcher, Playwright crawler, summary service |
| `src/lib/rss/` | RSS feed fetcher, content scraper, DB service |
| `src/lib/sse/` | SSE PubSub for real-time progress |
| `src/lib/notification/` | Webhook service (Discord/Slack) |
| `src/lib/auth/` | Phone-based auth with SMS |
| `src/app/api/` | REST API routes (28 endpoints) |
| `src/components/` | React components (layout, news, widgets) |
| `worker/` | Standalone cron worker for production |
| `e2e/` | Playwright E2E tests |

## Recent Changes (v0.1.2 → v1.0.0)

1. **Type Safety**: Removed all `as any` from `src/` (cache-service, crypto route)
2. **New Tests**: scheduler-service (10), pubsub (8), playwright-crawler (7)
3. **CI/CD**: GitHub Actions workflow added
4. **Bug Fixes**: cache-service SET order, crypto route type, cron SSE error handling
5. **Documentation**: README expanded, CHANGELOG created
6. **Infrastructure**: Setup.ts restored with jest-dom + fetch mock

## Known Issues

- `content-scraper.ts` uses dynamic `cheerio` import — tested with Jest but requires full DOM env for true integration tests
- E2E tests (`e2e/`) require actual database with seeded data — skip gracefully when empty
- Coverage on financial modules (market, crypto, exchange) still below 50%
- `effect` package (Prisma transitive dep) may require manual `dist/cjs` on fresh install (npm rebuild effect)

## Architecture Decisions

- **Dual Prisma schemas**: `schema.prisma` (PG) + `schema.sqlite.prisma` (SQLite dev). Both must be kept in sync manually.
- **Singleton services**: `cacheService`, `schedulerManager`, PubSub instances — use `getSchedulerManager()` in cron/worker context.
- **SSE for progress**: `fetchProgressPubSub` broadcasts RSS fetch progress to connected clients.
- **No ORM for financial data**: Direct API calls to Upbit/KIS/ExchangeRate-API, cached via `cacheService`.

## Contact

- **Author**: kangwonPark / Park KW
- **Repo**: `D:\260710크롤링\economy-news`
- **Railway**: economy-news-production (auto-deploy from main)
