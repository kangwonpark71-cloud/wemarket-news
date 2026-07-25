# Next Tasks

## Priority 0 — Before Next Release

- [ ] **E2E test suite with seeded data** — current E2E tests skip when DB is empty. Set up a test database or seed data for reliable E2E runs.
- [ ] **Coverage optimization** — add unit tests for financial services (market-index, crypto, exchange-rate). Current coverage: ~45%.

## Priority 1 — Quality

- [ ] **content-scraper integration test** — `scrapeArticleContent()` is imported by Article page but has no integration test with actual HTML.
- [ ] **Dual schema sync** — `prisma/schema.prisma` and `prisma/schema.sqlite.prisma` diverge easily. Consider single-schema + SQLite via `datasource` override.
- [ ] **Flaky test audit** — `fetcher.test.ts` (ai-it) sometimes hits Jest 30s timeout due to async mock interplay. Monitor and stabilize.

## Priority 2 — Features

- [ ] **Daily digest email** — aggregate top news + AI summary into morning email.
- [ ] **Notification preferences UI** — let users configure webhook URLs and hot keywords from settings page.
- [ ] **Caching dashboard** — expose cache hit/miss metrics for financial dashboard.
- [ ] **Search endpoint** — full-text search across articles (Fuse.js or Postgres `tsvector`).
- [ ] **Performance monitoring** — track API latency, fetch duration, error rates over time.

## Priority 3 — Maintenance

- [ ] **Update dependencies** — `prisma` 6.19.3 → 7.x (major upgrade, breaking changes expected).
- [ ] **Remove dead code** — `src/lib/rss/cache.ts` (no imports anywhere).
- [ ] **TypeScript strict mode** — enable `strict: true` in `tsconfig.json` and fix resulting errors.
