import { apiError } from '@/lib/api-response';

/**
 * Admin registration endpoint — DISABLED for security.
 * Admin accounts should be created via environment variables or database directly.
 */
export async function GET() {
  return apiError('Not available', 404);
}

export async function POST() {
  return apiError('Admin registration is disabled for security. Use database directly.', 403);
}
