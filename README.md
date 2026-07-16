# wemarket-news / economy-news

경제/IT 뉴스 애그리게이터. RSS 피드, Playwright 크롤러, 금융 데이터 API 통합.

## Getting Started

```bash
# Install dependencies
npm install

# Set up database (SQLite for local dev)
cp .env.development .env.local
npm run db:push
npm run db:seed

# Start dev server
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:push` | Push schema to DB |
| `npm run db:seed` | Seed RSS sources |
| `npm run db:studio` | Prisma Studio |
| `npm run worker` | Standalone cron worker |
| `npm run fetch` | Trigger RSS fetch (requires dev server) |
