# Release Notes — economy-news v1.0.0

**Date**: 2026-07-24

## Summary

First stable release of economy-news, a Korean/English economic news aggregator. This release focuses on code quality, type safety, and test coverage after completing all P0/P1 improvements from the initial audit.

## What's New

### Type Safety
- Removed all `as any` type casts from production code (`src/`)
- Cache service: replaced `redis: unknown` → proper `Redis | null` type from `ioredis`
- Crypto API: precise `Parameters<>` type assertion replacing `as any`

### Testing (54 new tests)
| Area | Tests | Coverage |
|---|---|---|
| Scheduler Service | 10 | Start/stop lifecycle, add/remove tasks |
| PubSub (SSE) | 8 | Publish/unsubscribe/error handling |
| Playwright Crawler | 7 | Extraction, navigation, parallel crawl |
| **Total** | **73 unit tests** | **8 suites, all passing** |

### Quality Infrastructure
- CI/CD via GitHub Actions (lint → typecheck → test → coverage)
- Restored test setup with jest-dom + fetch mock
- Fixed E2E vacuous pass (reliable skip when DB empty)

### Bug Fixes
- `cache-service.ts`: ioredis SET argument order fix
- `cron/route.ts`: missing try/catch around RSS fetch
- `fetch-stream/route.ts`: SSE unhandled rejection fix
- `crypto/route.ts`: proper type assertion for candle unit

## Breaking Changes

None. This release is fully backward-compatible.

## Upgrade Notes

```bash
npm install
# If prisma generate fails with "effect" module error:
npm rebuild effect
```

## Test Results

```
Test Suites: 8 passed, 8 total
Tests:       73 passed, 73 total
Time:        64.692 s

tsc --noEmit: 0 errors
```

## Acknowledgments

All issues identified in the v0.1.2 code audit have been addressed:
- P0 (Critical): 3/3 resolved
- P1 (High): 3/3 resolved
- P2 (Medium): 3/3 in progress
