# Next Tasks — economy-news v1.0.0+

현재 v1.0.0 배포 완료. 다음 개발자가 진행할 우선순위 작업 목록.

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

### 2. SQLite/PostgreSQL 스키마 동기화

- `prisma/schema.prisma` (PG)와 `prisma/schema.sqlite.prisma` (SQLite) 간 차이 자동 감지 스크립트
- 또는 SQLite 파일을 PG에서 자동 생성 (단일 진실 공급원으로)

### 3. 에러 모니터링 대시보드

- Sentry 또는 유사 APM 도입
- 수집 실패율/API 지연 시간 대시보드

---

## P1 — High

### 4. 번역 파이프라인 활성화

- `translation-service.ts`의 `processPendingTranslations()`가 현재 호출되지 않음
- RSS/AI-IT 수집 완료 후 자동 번역 트리거 연결 필요
- 번역 큐 모니터링 대시보드

### 5. 관리자 페이지 고도화

- 수집 로그 뷰어 (실패율, 소스별 상태)
- 수동 수집 트리거 버튼
- 캐시 무효화 기능
- 사용자 관리 (목록/차단)

### 6. 성능 최적화

- **이미지 lazy loading** — `next/image`로 뉴스 썸네일 최적화
- **데이터베이스 인덱스** — 자주 조회하는 컬럼에 인덱스 추가 (sourceType, publishedAt, category)
- **ISR/SSG** — 정적 페이지 pre-render 고려 (카테고리 페이지)
- **Bundle 분석** — `@next/bundle-analyzer`로 번들 사이즈 최적화

---

## P2 — Medium

### 7. 사용자 기능

- 소셜 로그인 (Google/Kakao/Naver)
- 북마크 폴더/태그 기능
- 읽은 기사 히스토리
- 기사 공유 (Twitter/KakaoTalk/Link 복사)

### 8. 알림 시스템

- PWA 푸시 알림 (새 기사 알림)
- 이메일 뉴스레터 발송 자동화 (SendGrid/Mailgun)
- 맞춤 키워드 알림 (사용자 설정)

### 9. 뉴스 퀄리티

- 중복 기사 병합 (같은 주제 다른 소스)
- 오래된 기사 아카이빙 정책
- 크롤링 실패 시 재시도 전략 개선

---

## P3 — Low (Nice to have)

### 10. 프론트엔드 개선

- 다국어 지원 (i18n)
- 애니메이션/트랜지션 (framer-motion)
- PWA 오프라인 지원
- 접근성 개선 (WCAG 2.1 AA)

### 11. DevOps

- GitHub Actions PR preview (Vercel/Cloudflare Preview)
- Staging 환경 분리
- 데이터베이스 백업 자동화 (Railway Volume + cron)

### 12. 분석/부가 기능

- Google Analytics / Plausible 연동
- 인기 기사 랭킹 (조회수 기반)
- AI 요약 피드백 (좋아요/싫어요)

---

## 기술 부채

| 항목 | 심각도 | 설명 |
|------|--------|------|
| `as unknown as Record<string,unknown>` | 낮음 | RSS 파서 XML namespace 접근 — 안전하나 우아하지 않음 |
| Playwright crawler 헤드리스 모드 | 낮음 | CI에서 헤드리스 설정 개선 가능 |
| ESLint 설정 미흡 | 중간 | flat config에 더 엄격한 규칙 추가 필요 |
| any 타입 잔재 | 중간 | 일부 API 응답 처리에 any 사용 중 |
