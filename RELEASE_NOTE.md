# v1.0.0 Release Note

**배포일**: 2026-07-26
**프로젝트**: Economy News — 경제/AI/IT 뉴스 애그리게이터
**배포 환경**: Railway (Production)

---

## 요약

경제 뉴스 수집, AI 요약, 금융 데이터 대시보드를 통합한 최초 공개 버전입니다. 40+ 뉴스 소스에서 실시간으로 기사를 수집하고, GPT-4o-mini로 요약하며, 주식/암호화폐/환율/글로벌 지수 대시보드를 제공합니다.

---

## 주요 변경사항

### 새로운 기능
- RSS 뉴스 수집 (한국경제, 매일경제, 연준 등)
- AI/IT 뉴스 수집 (30+ 해외 소스, RSS + Playwright 크롤러)
- AI 기반 뉴스 요약 (GPT-4o-mini + 규칙 기반 fallback)
- 금융 대시보드 (KOSPI/KOSDAQ, Upbit 암호화폐, 환율, 글로벌 지수)
- 실시간 수집 상태 SSE 스트리밍
- 다크모드 지원
- 카테고리별 뉴스 뷰 (12개 카테고리)
- 키워드 검색
- 사용자 설정 (전화번호 회원가입, 소스 숨기기)
- Discord/Slack 웹훅 알림

### 개선사항
- 타입 안전성 강화 (Prisma inferred 타입으로 `as` 캐스팅 제거)
- 메모리 누수 수정 (번역 큐 상한 5000 도입)
- Pagination 공통 컴포넌트화 (4개 페이지 중복 제거)
- typecheck 스크립트 추가 (CI 파이프라인 완성)

### 버그 수정
- layout.tsx 빈 catch 블록 FOUC 스크립트 보강
- translation-service.ts unsafe 타입 캐스팅 수정
- search 페이지 AI-IT 아티클 타입 에러 수정

### 테스트
- Jest 테스트 200개 통과 (19 suites)
- 핵심 API/서비스 모듈 85-100% 커버리지
- Playwright E2E 테스트

---

## 배포 절차

```bash
# 1. 환경 변수 설정 (Railway Dashboard)
# DATABASE_URL, CRON_SECRET, OPENAI_API_KEY

# 2. Railway 배포
git push railway main

# 3. 데이터베이스 마이그레이션
# railway.json preDeploy에서 자동 실행:
#   npx prisma db push --accept-data-loss

# 4. 헬스 체크 확인
curl https://<app-url>/api/health
```

---

## 모니터링

- `/api/health` — 헬스 체크 엔드포인트
- Railway Dashboard → Deployments 로그
- Railway Dashboard → Metrics (CPU/Memory)
- 수집 로그: `/api/fetch-logs`

---

## 알려진 이슈

1. **SQLite/Prisma 이중 관리**: production (PostgreSQL)과 dev (SQLite) 스키마 파일이 분리되어 있어, 모델 변경 시 두 파일 모두 수정 필요
2. **KIS API 장애**: KIS API 응답 없을 경우 시뮬레이션 모드로 fallback (가격 변동성 낮음)
3. **OpenAI API fallback**: GPT-4o-mini 키 없을 시 규칙 기반 요약으로 대체 (품질 저하)
4. **테스트 커버리지**: 전체 54.5% (금융/캐시/유틸리티 모듈 추가 테스트 필요)

---

## 롤백 방법

- Railway Dashboard → Deployments → 이전 배포 선택 → Redeploy
- 또는 `git revert` 후 재배포

---

## 문의

- Repository: [GitHub Repository URL]
- Author: [Project Maintainer]
