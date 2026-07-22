import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Rate Limiting (in-memory sliding window) ────────────────────────────────

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const key = ip
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetMs: windowMs }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: entry.resetTime - now,
    }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetMs: entry.resetTime - now }
}

// ─── Route Configuration ─────────────────────────────────────────────────────
// Railway shares a single outbound IP — per-IP limits must be generous.

const API_RATE_LIMIT = 200
const CRON_RATE_LIMIT = 10
const WRITE_RATE_LIMIT = 200

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return '127.0.0.1'
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = getClientIp(request)

  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // ─── Rate Limiting ───────────────────────────────────────────────────────
  let rateLimit = API_RATE_LIMIT
  if (pathname.startsWith('/api/cron') || pathname.startsWith('/api/ai-it/trigger')) {
    rateLimit = CRON_RATE_LIMIT
  } else if (method !== 'GET' && method !== 'HEAD') {
    rateLimit = WRITE_RATE_LIMIT
  }

  const windowMs = 60 * 1000 // 1 minute
  const { allowed, remaining, resetMs } = checkRateLimit(ip, rateLimit, windowMs)

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil(resetMs / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(resetMs / 1000)),
          'X-RateLimit-Limit': String(rateLimit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  // ─── Security Headers ────────────────────────────────────────────────────
  const response = NextResponse.next()

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  // Rate limit headers
  response.headers.set('X-RateLimit-Limit', String(rateLimit))
  response.headers.set('X-RateLimit-Remaining', String(remaining))

  if (pathname.startsWith('/api/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    )
  } else {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    )
  }

  // ─── CSRF Protection for mutations ───────────────────────────────────────
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    // Allow cron endpoint with Bearer token (already has its own auth)
    if (pathname.startsWith('/api/cron')) {
      return response
    }

    // Allow health check
    if (pathname.startsWith('/api/health')) {
      return response
    }

    // Check Origin header for CSRF
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (origin && host) {
      try {
        const originUrl = new URL(origin)
        if (originUrl.host !== host) {
          // Allow Railway domains
          const isRailwayDomain =
            host.includes('.up.railway.app') || host.includes('.railway.app')
          const originIsRailway =
            originUrl.host.includes('.up.railway.app') || originUrl.host.includes('.railway.app')

          if (!(isRailwayDomain && originIsRailway)) {
            return NextResponse.json(
              { error: 'CSRF validation failed' },
              { status: 403 }
            )
          }
        }
      } catch {
        // Invalid origin header
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
