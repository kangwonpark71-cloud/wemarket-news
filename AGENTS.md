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

The project has three distinct data systems with SEPARATE models:

1. **RSS system** (Source, Article, FetchLog) — for hankyung/mk/feeds economy news
2. **AI/IT system** (NewsSource, NewsArticle, NewsTag, NewsSummary, etc.) — for AI/IT blog/news aggregation
3. **Financial system** (Stock, StockPrice, Cryptocurrency, ExchangeRate, GlobalIndex, etc.)

These systems do not share models or queries.

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
| `npm run fetch` | Trigger RSS fetch (curl to /api/cron) |

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

- The Rss and AI/T systems have separate database tables and do not share state.
- The Playwright crawler (`src/lib/ai-it/playwright-crawler.ts`) is a separate tool from the RSS fetcher.
- The file `src/lib/ai-it/summary-service.ts` provides rule-based summarization (not LLM), despite its name.
- The `worker/index.ts` is a standalone script for running RSS backend in server deployments.
- The `healthcheckPath` in production is `/api/health`.
