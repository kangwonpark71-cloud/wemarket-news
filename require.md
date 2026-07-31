# Economy News — 요구사항 정의서 (Requirements)

> **목적**: AI가 컨텍스트를 잃어도 일관된 방향으로 개발을 계속하기 위한 기준 문서  
> **마지막 갱신**: 2026-07-30  
> **현재 단계**: Phase 6 (고도화)

---

## Phase 0 — 프로젝트 초기화 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P0-1 | Next.js 16 + TypeScript + Tailwind CSS v4 프로젝트 설정 | ✅ |
| P0-2 | Prisma ORM (PostgreSQL 프로덕션 / SQLite 로컬) | ✅ |
| P0-3 | Jest + Playwright 테스트 프레임워크 | ✅ |
| P0-4 | Railway 배포 구성 (nixpacks.toml, railway.json) | ✅ |
| P0-5 | ESLint flat config + AGENTS.md | ✅ |

## Phase 1 — 뉴스 수집 파이프라인 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P1-1 | RSS 피드 수집 (한국경제, 매일경제, Fed 등) | ✅ |
| P1-2 | AI/IT 뉴스 수집 (OpenAI, TechCrunch, 30+ sources) | ✅ |
| P1-3 | Playwright 기반 크롤러 | ✅ |
| P1-4 | 3시간 간격 RSS / 15-60분 간격 AI/IT 스케줄러 | ✅ |
| P1-5 | SSE 실시간 수집 진행률 | ✅ |
| P1-6 | AI 요약 (LLM 우선, 규칙 기반 fallback) | ✅ |
| P1-7 | 해외 기사 번역 (GPT-4o-mini) | ✅ |

## Phase 2 — 금융 데이터 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P2-1 | 국내 주식 (KOSPI/KOSDAQ) 실시간 시세 | ✅ |
| P2-2 | 암호화폐 (Upbit) 현재가 + 캔들차트 | ✅ |
| P2-3 | 환율 (USD/JPY/EUR/CNY) | ✅ |
| P2-4 | 글로벌 지수 (DJI/NASDAQ/S&P 500/VIX) | ✅ |
| P2-5 | 금융 대시보드 (Redis 60초 캐싱) | ✅ |
| P2-6 | Stock Watchlist (SSE 실시간 업데이트) | ✅ |

## Phase 3 — 사용자 시스템 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P3-1 | 회원가입 (이메일/전화번호 + scrypt 비밀번호) | ✅ |
| P3-2 | 로그인/로그아웃 (세션 관리 + httpOnly 쿠키) | ✅ |
| P3-3 | SMS 전화번호 인증 (Twilio) | ✅ |
| P3-4 | 사용자 설정 (테마, 언어, 관심분야, 히든소스) | ✅ |
| P3-5 | 다크모드 (light/dark/system) | ✅ |
| P3-6 | 관리자 RBAC (USER/ADMIN) | ✅ |

## Phase 4 — 시스템 안정화 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P4-1 | 8개 Jest 테스트 실패 수정 → 228/228 pass | ✅ |
| P4-2 | SQLite/PostgreSQL 스키마 드리프트 방지 스크립트 | ✅ |
| P4-3 | KMA 날씨 API 키 → 환경변수 | ✅ |
| P4-4 | JWT_SECRET gitignore 확인 | ✅ |
| P4-5 | AdDisplay XSS sanitize-html | ✅ |

## Phase 5 — 확장 기능 ✅

| ID | 요구사항 | 상태 |
|---|---|---|
| P5-1 | **캐시 무효화** — 관리자 대시보드에서 패턴별/전체 캐시 삭제 | ✅ |
| P5-2 | **중복 기사 병합 엔진** — 제목 정규화 → 그룹화 → 가장 오래된 기사 유지, 연관관계 재연결 | ✅ |
| P5-3 | **사용자 키워드 알림** — UserPreference.alertKeywords 저장, 신규 기사 매칭, Push 발송 | ✅ |
| P5-4 | **AI 추천 엔진** — 키워드/카테고리/태그 기반 콘텐츠 추천 + 인기기사 | ✅ |
| P5-5 | **Push 알림** — web-push VAPID, sendToUser/sendToAll/sendKeywordAlert | ✅ |
| P5-6 | **Push → 키워드 알림 연동** — dispatchAlerts()에서 실시간 Push 발송 | ✅ |
| P5-7 | **자동 병합 스케줄러** — 3시간마다 duplicate-merge-scheduler 실행 | ✅ |
| P5-8 | **인기 기사 위젯** — 홈페이지 사이드바 (조회수 기준 top 7) | ✅ |

## Phase 6 — 고도화 (🔥 현재 단계)

### 6a — 뉴스레터 시스템

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| P6a-1 | 구독 API (이메일 등록) | HIGH | ✅ 기존 |
| P6a-2 | 구독 해지 API (unsubscribe) | HIGH | ⬜ |
| P6a-3 | 관리자 구독자 목록 페이지 (검색/필터링/내보내기) | HIGH | ⬜ |
| P6a-4 | 뉴스레터 발송 API (관리자 → 전체 구독자) | HIGH | ⬜ |
| P6a-5 | 뉴스레터 템플릿 (일일 인기기사 Top 10) | MEDIUM | ⬜ |
| P6a-6 | 자동 뉴스레터 스케줄러 (매일 오전 8시) | MEDIUM | ⬜ |
| P6a-7 | 관리자 대시보드에 뉴스레터 통계 | LOW | ⬜ |

### 6b — AI 챗봇

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| P6b-1 | AI 뉴스 Q&A API (/api/ai/chat) | HIGH | ⬜ |
| P6b-2 | 경제/금융 질문에 뉴스 기반 답변 (RAG) | HIGH | ⬜ |
| P6b-3 | 채팅 UI 컴포넌트 (floating button + modal) | MEDIUM | ⬜ |
| P6b-4 | 채팅 히스토리 저장 (DB) | LOW | ⬜ |

### 6c — 소셜 로그인

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| P6c-1 | **Google OAuth** — 인증 + 콜백 처리 | HIGH | ⬜ |
| P6c-2 | **Kakao OAuth** — 인증 + 콜백 처리 | HIGH | ⬜ |
| P6c-3 | 기존 계정 연결 (소셜 ID ↔ User) | MEDIUM | ⬜ |
| P6c-4 | 로그인 페이지 소셜 버튼 UI | MEDIUM | ⬜ |

### 6d — 모바일 앱 (PWA)

| ID | 요구사항 | 우선순위 | 상태 |
|---|---|---|---|
| P6d-1 | Service Worker 오프라인 페이지 지원 | MEDIUM | ⬜ |
| P6d-2 | PWA 설치 배너 (BeforeInstallPrompt) | MEDIUM | ⬜ |
| P6d-3 | 모바일 하단 네비게이션 바 | MEDIUM | ⬜ |
| P6d-4 | 터치/스와이프 제스처 최적화 | LOW | ⬜ |

---

## Phase 7 — 차기 기능 (계획)

| ID | 요구사항 | 예상 단계 |
|---|---|---|
| P7-1 | 다국어 지원 (i18n: 한국어/영어/일본어/중국어) | Phase 7 |
| P7-2 | 개인화된 뉴스 피드 (AI 큐레이션) | Phase 7 |
| P7-3 | 광고 대시보드 (impression/click 통계 고도화) | Phase 7 |
| P7-4 | 오류 모니터링/APM (Sentry) | Phase 7 |
| P7-5 | 테스트 커버리지 70% 이상 | Phase 7 |
| P7-6 | GitHub Actions CI/CD | Phase 7 |
| P7-7 | RSS 피드 직접 추가 (사용자 커스텀 Feed) | Phase 7 |

---

## 용어 설명

| 용어 | 의미 |
|---|---|
| `Article` | 통합 뉴스 기사 (RSS + AI/IT 모두 포함, sourceType으로 구분) |
| `Source` | RSS 또는 AI/IT 수집 채널 |
| `FetchLog` | 각 수집 실행에 대한 로그 |
| `CacheTTL` | Redis 캐시 TTL 상수 (financial=60s, articles 등) |
| `CacheKeys` | 캐시 키 패턴 (financial/stock/crypto/forex/global/articles/ai-it) |
| `BaseScheduler` | 스케줄러 추상 클래스 (executeJob→recordSuccess/recordFailure) |
| `SchedulerManager` | 모든 스케줄러를 등록/시작/중지하는 싱글톤 |
