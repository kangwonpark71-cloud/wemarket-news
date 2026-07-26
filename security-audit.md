# Security Audit Report — economy-news v1.0.0

**Date**: 2026-07-26
**Scope**: Full source code review (`src/`)

---

## Summary

| Severity | Count | Actionable |
|----------|-------|------------|
| CRITICAL | 0 | — |
| HIGH | 1 | Move hardcoded auth key to env var |
| MEDIUM | 1 | Add content sanitization for ad HTML |
| LOW | 0 | — |
| INFO | 3 | Accepted patterns documented |

---

## HIGH — Hardcoded API Key in Weather Route

**File**: `src/app/api/weather/route.ts:17`
```typescript
const authKey = 'DbUh4_ekRRi1IeP3pPUYog'
```

**Issue**: 기상청 (KMA) API authentication key hardcoded in source code. While this key grants access to public weather data, hardcoding prevents key rotation and exposes credentials in version control.

**Fix**: Move to environment variable:
```typescript
const authKey = process.env.KMA_AUTH_KEY
```

**Severity**: HIGH — exposed credential in source

---

## MEDIUM — Unsanitized HTML in Ad Display

**File**: `src/components/ui/AdDisplay.tsx:67`
```typescript
dangerouslySetInnerHTML={{ __html: content }}
```

**Issue**: Advertisement content rendered as raw HTML. If ad content is stored from user-controlled input or compromised at the database level, this could enable XSS.

**Context**: The `content` field comes from `Advertisement` DB model, which is managed through the admin panel. Ads are created by administrators, not end users.

**Risk**: Low (admin-only content source), but defense-in-depth recommended.

**Fix**: 
1. Sanitize with DOMPurify: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}`
2. Or enforce that ad content is restricted to safe HTML tags

**Severity**: MEDIUM

---

## INFO — Accepted Patterns (No Action Required)

### 1. layout.tsx dangerouslySetInnerHTML (FOUC Prevention)
**File**: `src/app/layout.tsx:36`
Inline script for theme initialization before React hydration. This is standard Next.js dark mode pattern — safe because the content is a hardcoded string literal, not user input.

### 2. password/env variable handling in auth.ts
**File**: `src/lib/utils/auth.ts`
Password hashing uses scrypt with per-user random salt. JWT uses HMAC-SHA256 with configurable server secret. No plaintext password logging. ✅

### 3. API authentication patterns
- Cron endpoints use Bearer token with `CRON_SECRET` — standard pattern ✅
- Session tokens use `httpOnly` cookies with `secure` flag in production ✅
- Phone verification requires no sensitive data exposure ✅

---

## Recommendations

### Pre-deployment
1. **Move KMA auth key to env var** (`KMA_AUTH_KEY`)
2. **Add HTML sanitization** to AdDisplay component using DOMPurify or similar
3. **Verify JWT_SECRET length** — instrumentation.ts already warns if <32 chars ✅
4. **Verify CORS policy** for Railway deployment (if applicable)

### Post-deployment
1. Set up rate limiting on login/verify-phone endpoints
2. Consider Content Security Policy headers
3. Regular dependency vulnerability scanning (`npm audit`)
