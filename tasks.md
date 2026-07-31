# Economy News — 진행 상황 추적 (Tasks)

> **목적**: AI가 세션 간 전환 시에도 정확히 어디까지 진행했는지 파악하기 위한 기록  
> **마지막 갱신**: 2026-07-30  
> **다음 작업**: Phase 6a (뉴스레터 시스템) 구현

---

## 상태 범례

| 기호 | 의미 |
|---|---|
| ✅ | 완료 |
| 🔄 | 진행 중 |
| ⬜ | 미시작 |
| ❌ | 문제 있음 |
| 🚫 | 보류 |

---

## Git History

```
cab3577 (HEAD -> main, origin/main) build: Phase 1-5 complete — cache invalidate, duplicate merge, keyword alerts, recommendations, push, auto-merge scheduler, popular widget
```

---

## Phase 0-5: 완료

모든 Phase 0-5 작업은 `cab3577`에서 완료되었습니다. 총 239개 파일, 30,519 LOC.  
상세: `require.md` Phase 0-5 참조.

---

## Phase 6: 고도화 (진행 중)

### 6a — 뉴스레터 시스템

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6a-1 | NewsletterSubscription 모델 확인 | prisma/schema.prisma | ✅ | 이미 존재 |
| 6a-1s | 동일 모델 SQLite 스키마에도 반영 | prisma/schema.sqlite.prisma | ✅ | 이미 존재 |
| 6a-2 | 구독 API 구현 | src/app/api/newsletter/subscribe/route.ts | ✅ | 이미 존재 |
| 6a-3 | 구독 해지 API (unsubscribe) | src/app/api/newsletter/unsubscribe/route.ts | ⬜ | 새로 생성 |
| 6a-4 | 관리자 구독자 페이지 | src/app/admin/newsletter/page.tsx | ⬜ | 새로 생성 |
| 6a-5 | 뉴스레터 발송 서비스 (nodemailer) | src/lib/services/newsletter/newsletter-service.ts | ⬜ | 새로 생성 |
| 6a-6 | 뉴스레터 발송 API | src/app/api/admin/newsletter/send/route.ts | ⬜ | 새로 생성 |
| 6a-7 | 관리자 nav + layout 추가 | src/app/admin/layout.tsx | ⬜ | 수정 |
| 6a-8 | 자동 뉴스레터 스케줄러 | src/lib/scheduler/newsletter-scheduler.ts | ⬜ | 새로 생성 |
| 6a-9 | 인증: verify-email API | src/app/api/auth/verify-email/route.ts | ⬜ | 새로 생성 |

### 6b — AI 챗봇

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6b-1 | 채팅 Q&A API | src/app/api/ai/chat/route.ts | ⬜ | 새로 생성 |
| 6b-2 | RAG 검색 유틸 (뉴스 기반 응답) | src/lib/services/chat/rag-service.ts | ⬜ | 새로 생성 |
| 6b-3 | 채팅 UI 컴포넌트 | src/components/chat/ChatWidget.tsx | ⬜ | 새로 생성 |
| 6b-4 | 메인 레이아웃에 채팅 위젯 추가 | src/app/layout.tsx | ⬜ | 수정 |

### 6c — 소셜 로그인

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6c-1 | SocialAccount 모델 추가 (schema.prisma) | prisma/schema.prisma | ⬜ | 마이그레이션 필요 |
| 6c-1s | 동일 모델 SQLite 스키마 | prisma/schema.sqlite.prisma | ⬜ | 수정 |
| 6c-2 | Google OAuth API | src/app/api/auth/google/route.ts | ⬜ | 새로 생성 |
| 6c-3 | Google OAuth 콜백 | src/app/api/auth/google/callback/route.ts | ⬜ | 새로 생성 |
| 6c-4 | Kakao OAuth API | src/app/api/auth/kakao/route.ts | ⬜ | 새로 생성 |
| 6c-5 | Kakao OAuth 콜백 | src/app/api/auth/kakao/callback/route.ts | ⬜ | 새로 생성 |
| 6c-6 | OAuth 서비스 (토큰 교환, 계정 연결) | src/lib/services/auth/oauth-service.ts | ⬜ | 새로 생성 |
| 6c-7 | 로그인 페이지 소셜 버튼 | src/app/login/page.tsx | ⬜ | 수정 |

### 6d — 모바일 앱 (PWA)

| 작업 ID | 작업명 | 파일 | 상태 | 비고 |
|---|---|---|---|---|
| 6d-1 | 오프라인 페이지 (fallback) | src/app/offline/page.tsx | ⬜ | 새로 생성 |
| 6d-2 | SW 캐싱 전략 개선 | public/sw.js | ⬜ | 수정 |
| 6d-3 | InstallPrompt 컴포넌트 | src/components/layout/InstallPrompt.tsx | ⬜ | 새로 생성 |
| 6d-4 | 모바일 하단 네비게이션 | src/components/layout/MobileNav.tsx | ⬜ | 새로 생성 |
| 6d-5 | Root layout에 모바일 nav 추가 | src/app/layout.tsx | ⬜ | 수정 |

---

## 테스트 현황

| 영역 | Suite 수 | 테스트 수 | 통과 | 비고 |
|---|---|---|---|---|
| 전체 | 22 | 228 | 228 | ✅ |
| Jest 단위 | 3+ | ~50 | ✅ | |
| Playwright E2E | 19 | ~178 | ✅ | |

## 커버리지 현황 (목표: 70%)

| 모듈 | Coverage | 상태 |
|---|---|---|
| stock-service | 24% | ⬜ |
| cache-service | 38% | ⬜ |
| financial-service | 40% | ⬜ |
| auth | 26% | ⬜ |
| session-store | 14% | ⬜ |
| playwright-crawler | 39% | ⬜ |
| utils | 37% | ⬜ |

---

## Railway 배포 정보

| 항목 | 값 |
|---|---|
| 프로젝트 | accurate-magic |
| 서비스 | beneficial-insight |
| Health | ✅ 200 OK |
| 도메인 | beneficial-insight.up.railway.app |
| DB | PostgreSQL (Railway) |
| 배포 방식 | GitHub Push (CI 미연결, 수동) |
