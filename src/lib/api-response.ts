/**
 * Standardized API Response Helpers
 * Ensures consistent JSON response format across all API routes.
 *
 * Usage:
 *   import { apiSuccess, apiError, apiPaginated, ErrorCode } from '@/lib/api-response'
 *   return apiSuccess(data)
 *   return apiError('Not found', 404)
 *   return apiError('Session expired', 401, ErrorCode.UNAUTHORIZED)
 *   return apiPaginated(items, { page, limit, total })
 *
 * Error responses always carry a stable machine-readable `code` so clients can
 * branch on error type instead of parsing human-readable messages.
 */

import { NextResponse } from 'next/server'

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

const ERROR_CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  429: ErrorCode.RATE_LIMITED,
  501: ErrorCode.NOT_IMPLEMENTED,
  503: ErrorCode.SERVICE_UNAVAILABLE,
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: ApiErrorCode
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Successful response with data
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Error response. `code` is derived from `status` when not provided, so most
 * call sites only need a message and an HTTP status.
 */
export function apiError(
  error: string,
  status = 500,
  code?: ApiErrorCode,
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error, code: code ?? ERROR_CODE_BY_STATUS[status] ?? ErrorCode.INTERNAL_ERROR },
    { status },
  )
}

/**
 * Paginated response
 */
export function apiPaginated<T>(
  items: T[],
  opts: { page: number; limit: number; total: number },
): NextResponse<ApiResponse<T[]>> {
  return NextResponse.json({
    success: true,
    data: items,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total: opts.total,
      totalPages: Math.ceil(opts.total / opts.limit),
    },
  })
}
