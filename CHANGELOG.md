# 📝 위마켓_뉴스 (economy-news) - 변경 이력 (Changelog)

본 프로젝트의 버전별 업데이트, 주요 기술적 고도화 명세 및 마일스톤 변경 이력입니다.

## [1.0.0] — 2026-07-24

### 🚀 주요 변경사항
- **타입 안전성**: `src/` 내 모든 `as any` 제거 (`cache-service.ts`: `Redis` 타입 적용, `crypto/route.ts`: `Parameters<>` 타입 가드)
- **CI/CD**: GitHub Actions 워크플로우 추가 (lint → typecheck → test → coverage)
- **테스트 인프라**: `setup.ts` 복구 (`jest-dom`, `fetch` mock, console noise 억제)
- **테스트 54개 추가**: 스케줄러(10), PubSub(8), Playwright 크롤러(7), AI/IT fetcher(10), summary(9), scheduler-service(10)
- **E2E 안정화**: `app.spec.ts` vacuous pass 제거 — DB 확인 후 `test.skip`으로 명확한 처리

### 🐛 버그 수정
- `cache-service.ts`: ioredis `SET` 명령어 인자 순서 오류 (`NX`/`EX` 위치) 수정
- `cron/route.ts`: `runRssFetch()` 호출 주변 `try/catch` 누락 수정
- `fetch-stream/route.ts`: SSE 스트림 초기화 시 `try/catch` 누락 수정
- `crypto/route.ts`: `unit` 파라미터 타입 캐스팅 정확한 타입으로 대체

### 📚 문서화
- `README.md`: 34줄 → 200+줄 상세 문서 (프로젝트 구조, API, 환경변수, 설치법)
- `CHANGELOG.md`, `HANDOFF.md`, `NEXT_TASK.md`, `RELEASE_NOTE.md` 생성

### 🏗 인프라
- `.github/workflows/ci.yml`: 자동화된 품질 게이트
- 패키지 버전 `1.0.0` 업데이트

## [0.1.2] — 2026-07-18

- Refactor: unified gHacks styling, crypto/forex/global pages, robust DB locks, heuristic scraper fallbacks, AI translation & webhooks
- Fix: instrumentaionHook enabled, AI/IT source seeding, dashboard/forex fixes
- Fix: dynamic scheduler import to prevent Playwright edge compilation
- Chore: Railway config, next.config.js migration, build cache invalidation
- Feat: auto-refresh dashboard, AI Times KR source, distributed locking, weather widget, admin controls
- **신규 기능 (5ea):** 해외 뉴스 자동 번역, API 에러 핸들링 감사, DB 기반 SMS 인증 (`JWT_SECRET` 시동 검사, CSRF 강화), KRW 통화 표시 통일(`formatKRW`), Mock SMS 모드
- **구조 변경:** `src/lib/utils/` 분할(auth, format, lock, rss-helper, sanitize, scheduler-error-handler, sms), `middleware.ts` 추가, `worker/` 분리
- **보안 강화:** CSRF 미들웨어, API 인증 체계, JWT 시크릿 검증

## [0.1.1] — 2026-07-16

- Various fixes and dependency updates
- Renovate bot configuration for automated dependency management

## [0.1.0] — 2026-07-15

- Initial release with RSS aggregation, AI/IT news crawling, financial dashboard, user auth, and dark mode
