# Next Tasks — economy-news v1.0.0+

현재 v1.0.0+ 배포 완료. 다음 개발자가 진행할 우선순위 작업 목록.
(2026-08-02 갱신: Phase 6/7 완료, 신규 기능 반영 — 다이제스트/브리핑/DB 백업 등)

---

## P0 — Critical (다음 스프린트 필수)

### 1. 테스트 커버리지 확대 (54.5% → 90%+)

| 모듈 | 현재 | 목표 | 접근법 |
|------|------|------|--------|
| `financial-service.ts` | 17% | 90% | 시장 데이터 API Mock 테스트 |
| `cache-service.ts` | 38% | 90% | Redis mock + in-memory fallback 테스트 |
| `scheduler-service.ts` | 30% | 90% | 스케줄러 시작/중지/에러 테스트 |
| `db-service.ts` (RSS) | 47% | 90% | Prisma mock 트랜잭션 테스트 |
| `utils.ts` | 37% | 90% | 유틸리티 함수 단위 테스트 |

> 전체 27 suites / 331 tests 통과 중. 위 모듈들에 단위 테스트 추가로 커버리지 목표 달성 필요.

### 2. SQLite/PostgreSQL 스키마 동기화

- ✅ `npm run db:check:drift` 스크립트로 차이 감지 (이번 세션에서 모델 변경 후 PASSED 확인)
- 남음: 변경 시 자동 적용 또는 커밋 훅 연동 (단일 진실 공급원으로)

### 3. 에러 모니터링 대시보드

- ✅ 관리자 error-log API/페이지 존재 (에러 로그 저장·조회)
- 남음: **Sentry 또는 유사 APM 도입** + 수집 실패율/API 지연 시간 대시보드

---

## P1 — High

### 4. 번역 파이프라인 — ✅ 이미 연결됨

- `src/lib/rss/db-service.ts:41`의 `processPendingTranslations()`(인메모리 큐, MAX 5000)가 활성화되어 있음
- 호출 지점: `src/lib/rss/scheduler.ts:108` (RSS 수집 후), `src/lib/ai-it/scheduler-service.ts` finally 블록 (AI/IT 수집 후)
- `translateArticleBatch` / `translateArticleTitleOnly` / `translateUntranslatedOverseas(limit=50)` 모두 동작
- 남음: 번역 큐 모니터링 대시보드 (번역 실패율, 대기 큐 크기)

### 5. 관리자 페이지 고도화

- ✅ 뉴스레터 발송/다이제스트 발송 관리, 에러 로그 뷰어
- 남음: 수동 수집 트리거 버튼, **캐시 무효화 기능**, 사용자 관리 (목록/차단)

### 6. 성능 최적화

- ✅ DB 인덱스 (Phase 7: sourceType/publishedAt, sourceId/publishedAt, category/publishedAt)
- ✅ ISR 부분 적용 (`/briefing` revalidate=300)
- 남음: **이미지 lazy loading** — `next/image`로 뉴스 썸네일 최적화
- 남음: 카테고리 페이지 ISR/SSG pre-render, **Bundle 분석** — `@next/bundle-analyzer`

---

## P2 — Medium

### 7. 사용자 기능

- ✅ 소셜 로그인 (Google/Kakao — `/api/auth/oauth/login?provider=...`)
- ✅ 북마크/읽은 기사 (기본 기능)
- 남음: Naver 로그인, 북마크 폴더/태그, 기사 공유 (Twitter/KakaoTalk/Link 복사)

### 8. 알림 시스템

- ✅ PWA 푸시 알림 (web-push, VAPID)
- ✅ 이메일 뉴스레터 발송 자동화 (nodemailer, 매일 08:00) + GET/POST 구독해지
- ✅ **맞춤형 뉴스 다이제스트** (관심 분야 7종 + 키워드, 매일 07:00, 구독자별 개인화)
- ✅ 맞춤 키워드 알림 (사용자 설정 alertKeywords)

### 9. 뉴스 퀄리티

- ✅ 중복 기사 병합 (스케줄러) + 스포츠 오염 필터
- 남음: 오래된 기사 아카이빙 정책, 크롤링 실패 시 재시도 전략 개선

---

## P3 — Low (Nice to have)

### 10. 프론트엔드 개선

- ✅ 다국어 지원 (i18n), PWA 오프라인 지원 (`/offline`, sw.js 캐시 전략)
- 남음: 애니메이션/트랜지션 (framer-motion), 접근성 개선 (WCAG 2.1 AA)

### 11. DevOps

- ✅ **DB 백업 자동화** (`npm run db:backup` — PG pg_dump / SQLite copy, 14개 보존)
- 남음: GitHub Actions PR preview (Vercel/Cloudflare Preview), Staging 환경 분리
- 남음: Railway Volume + cron 연동 (주기적 자동 백업)

### 12. 분석/부가 기능

- ✅ **오늘의 경제 브리핑** (조회수 기반 인기 랭킹 + 섹션 + 키워드, `/briefing`, 5분 캐시)
- 남음: Google Analytics / Plausible 연동, AI 요약 피드백 (좋아요/싫어요)

---

## 기술 부채

| 항목 | 심각도 | 설명 |
|------|--------|------|
| `as unknown as Record<string,unknown>` | 낮음 | RSS 파서 XML namespace 접근 — 안전하나 우아하지 않음 |
| Playwright crawler 헤드리스 모드 | 낮음 | CI에서 헤드리스 설정 개선 가능 |
| ESLint 설정 미흡 | 중간 | flat config에 더 엄격한 규칙 추가 필요 |
| any 타입 잔재 | 중간 | 일부 API 응답 처리에 any 사용 중 |
