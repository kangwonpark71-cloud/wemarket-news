/**
 * Standardized API Response Helpers
 * Ensures consistent JSON response format across all API routes.
 *
 * Usage:
 *   import { apiSuccess, apiError, apiPaginated } from '@/lib/api-response'
 *   return apiSuccess(data)
 *   return apiError('Not found', 404)
 *   return apiPaginated(items, { page, limit, total })
 */

import { NextResponse } from 'next/server'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
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
 * Error response
 */
export function apiError(error: string, status = 500): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status })
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
