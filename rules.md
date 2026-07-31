# Economy News — 개발 규칙 (Rules)

> **목적**: AI가 프로젝트 컨텍스트를 잃어도 일관된 코딩 패턴과 의사결정을 유지하기 위한 기준  
> **마지막 갱신**: 2026-07-30

---

## 1. 아키텍처 원칙

### 1.1 통합 테이블 아키텍처
- RSS와 AI/IT 뉴스는 `Article` + `Source` 통합 테이블을 사용한다
- 구분은 `Source.sourceType` (`RSS` | `AI_IT`) 필드로 한다
- **별도 테이블을 만들지 않는다** (NewsArticle/NewsSource 등은 과거 레거시)

### 1.2 API 패턴
- 모든 API 응답 형식: `{ success: boolean, data?: T, error?: string }`
- 성공 시: `NextResponse.json({ success: true, data: ... })`
- 실패 시: `NextResponse.json({ success: false, error: '메시지' }, { status: 4xx/5xx })`
- API 라우트 파일명: `route.ts` (Next.js App Router)
- HTTP 상태 코드: 200(성공), 400(입력오류), 401(미인증), 403(권한없음), 404(없음), 500(서버오류)

### 1.3 서비스 레이어 패턴
- 비즈니스 로직은 `src/lib/services/` 아래에 도메인별 디렉토리로 구성
- 서비스 함수는 `async function`으로, try-catch 내부 처리
- 서비스는 `createLogger('ServiceName')`로 로거 사용
- API 라우트는 서비스를 호출하고 응답만 구성 (thin route, fat service)

### 1.4 데이터베이스
- 모든 DB 접근은 Prisma Client를 통해서만 (`@/lib/db`의 싱글톤 `prisma`)
- raw query 사용 금지
- 모델/필드명: `camelCase` + `@map("snake_case")`로 DB 컬럼 매핑
- created_at/updated_at: `@default(now())` / `@updatedAt`

### 1.5 캐싱
- 금융 대시보드: Redis 60초 TTL (기본)
- 기사 목록: 변동적 (상황에 따라)
- 캐시 무효화 패턴: `cacheService.deleteByPattern('financial:*')`
- 캐시 키 패턴은 `CacheKeys` 상수에 정의

---

## 2. 코드 스타일

### 2.1 TypeScript
- `strict: true` (tsconfig.json)
- `any` 타입 사용 금지 (반드시 구체적 타입 지정)
- `@ts-ignore`, `@ts-expect-error`, `as any` 절대 금지
- 함수 반환타입 명시 (inferred 금지)
- import type 구분: `import type { X } from '...'` (타입 전용)

### 2.2 Import 규칙
- `@/` path alias 사용 (`src/` 기준): `@/lib/db`, `@/components/news/NewsList`
- 상대경로는 같은 디렉토리 내에서만 사용
- Import 순서: 외부 라이브러리 → 내부 모듈 → 상대경로

### 2.3 React/Next.js
- 컴포넌트: `export default function ComponentName()`
- 'use client' 지시어: 상호작용/state/hooks/effect 필요한 경우에만
- 서버 컴포넌트 기본, 클라이언트 컴포넌트는 필요한 경우만
- 이모지 사용 금지 (사용자 요청 시에만)
- Tailwind CSS v4 사용 (v3 호환 불가)
- CSS 클래스: `clsx()` 라이브러리로 조건부 클래스

### 2.4 에러 핸들링
- 빈 catch 블록 절대 금지
- API 에러: 반드시 로깅 후 사용자용 메시지 반환
- 서비스 에러: 상위 호출자에게 throw, API 레이어에서 catch
- 사용자 메시지는 한국어 (Korean)

### 2.5 프리티어/린트
- ESLint flat config (eslint.config.mjs)
- Prettier 별도 설정 없음 (ESLint에 통합)
- `npm run lint` 통과 필수
- `npm run build` 통과 필수 (TypeScript 에러 0)

---

## 3. 데이터베이스 스키마 변경 규칙

### 3.1 이중 스키마 유지보수
- **모든 모델/필드 변경은 반드시 두 파일에 동시 적용**:
  1. `prisma/schema.prisma` (PostgreSQL, 프로덕션)
  2. `prisma/schema.sqlite.prisma` (SQLite, 로컬 개발)
- 각 스키마 변경 후:
  - Postgres: `npm run db:generate`
  - SQLite: `npm run db:dev:generate`
  - 드리프트 검증: `npm run db:check:drift`

### 3.2 SQLite ↔ PostgreSQL 차이점
| 항목 | PostgreSQL | SQLite |
|---|---|---|
| Array 필드 | `String[]` 등 지원 | 사용 불가 → 파서 필요 |
| Decimal | `@db.Decimal(p, s)` | `Float`로 대체 |
| BigInt | 지원 | 지원 |
| @db.Text | @db.Text | @db.Text 사용 불가 → String |
| @db.Date | @db.Date | @db.Date 사용 불가 → DateTime |

### 3.3 마이그레이션 정책
- 로컬 개발: `npm run db:push` (schema push, migration 미사용)
- 프로덕션: Railway가 `railway.json`의 `preDeploy`에서 `prisma db push` 실행
- Prisma Migrate는 현재 사용하지 않음 (push-only)

---

## 4. 테스트 규칙

### 4.1 Jest
- `__tests__/` 디렉토리 또는 `*.test.ts` 파일
- Prisma 모킹: `jest.mock('@/lib/db')` → `mockDeep<PrismaClient>()`
- Cache 모킹: 모든 `CacheTTL` 상수 export 필수 포함
- 테스트 실행: `npm test`
- 새 기능 추가 시 최소 1개 테스트 케이스 필수

### 4.2 Playwright E2E
- `e2e/` 디렉토리
- `npm run test:e2e` 실행
- CI 환경에서는 헤드리스 모드

---

## 5. 배포 규칙

### 5.1 Railway
- GitHub Push 후 Railway에서 자동 감지하지 않음 (CI 미연결)
- 수동 배포: `railway deploy` 또는 Railway Dashboard
- Health check: `/api/health` (200 OK)
- Nixpacks 빌더 사용 (nixpacks.toml)
- Pre-deploy: `prisma db push` (railway.json)

### 5.2 환경 변수
| 변수 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | ✅ | 세션 HMAC 서명 키 |
| `TWILIO_ACCOUNT_SID` | ❌ | SMS 인증용 |
| `TWILIO_AUTH_TOKEN` | ❌ | SMS 인증용 |
| `TWILIO_PHONE_NUMBER` | ❌ | SMS 발신번호 |
| `OPENAI_API_KEY` | ❌ | AI 요약/번역용 |
| `VAPID_PUBLIC_KEY` | ❌ | Push 알림 (자동생성 가능) |
| `VAPID_PRIVATE_KEY` | ❌ | Push 알림 (자동생성 가능) |
| `VAPID_SUBJECT` | ❌ | Push 알림 (mailto:email) |
| `CRON_SECRET` | ❌ | Cron API 인증 (선택) |
| `KMA_AUTH_KEY` | ❌ | 기상청 API |

---

## 6. Git 규칙

- 커밋 메시지: 영어, prefix 사용 (feat/fix/build/refactor/docs)
- main 브랜치에 직접 커밋 (단일 개발)
- `git push` 전 `npm run build` + `npm test` 통과 필수
- 비밀번호/API 키/토큰 절대 커밋 금지 (.env는 gitignored)

---

## 7. 파일/디렉토리 규칙

```
src/
├── app/                    # Next.js App Router
│   ├── api/                #   API routes (/api/*)
│   │   ├── admin/          #   관리자 API (인증 필요)
│   │   ├── auth/           #   인증 관련
│   │   └── ...             #   일반 API
│   ├── admin/              # 관리자 페이지 (클라이언트)
│   ├── login/              # 로그인 페이지
│   └── ...                 # 일반 페이지
├── components/
│   ├── layout/             # 레이아웃 컴포넌트 (Header, Sidebar 등)
│   ├── news/               # 뉴스 관련 컴포넌트
│   ├── financial/          # 금융 관련 컴포넌트
│   ├── chat/               # 채팅 컴포넌트
│   └── ui/                 # 공통 UI 컴포넌트
├── lib/
│   ├── rss/                # RSS 수집 시스템
│   ├── ai-it/              # AI/IT 수집 시스템
│   ├── ai/                 # AI/LLM 서비스 (요약, 번역, 채팅)
│   ├── scheduler/          # 스케줄러 구현체
│   ├── services/           # 도메인 서비스
│   │   ├── alerts/         #   키워드 알림
│   │   ├── cache/          #   캐시 서비스
│   │   ├── chat/           #   AI 채팅
│   │   ├── crypto/         #   암호화폐
│   │   ├── duplicate/      #   중복 기사 병합
│   │   ├── financial/      #   금융 데이터
│   │   ├── market/         #   시장 데이터
│   │   ├── newsletter/     #   뉴스레터
│   │   ├── push/           #   Push 알림
│   │   ├── recommendation/ #   추천 엔진
│   │   ├── scheduler/      #   스케줄러 서비스
│   │   ├── search/         #   검색
│   │   ├── session/        #   세션 관리
│   │   └── auth/           #   OAuth
│   └── startup/            # 서버 시작시 실행
├── prisma/
│   ├── schema.prisma       # PostgreSQL (프로덕션)
│   └── schema.sqlite.prisma # SQLite (로컬 개발)
└── public/
    ├── sw.js               # Service Worker
    └── manifest.json       # PWA manifest
```
