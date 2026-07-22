import { NextResponse } from 'next/server';

/**
 * Admin registration endpoint — DISABLED for security.
 * Admin accounts should be created via environment variables or database directly.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Not available' },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Admin registration is disabled for security. Use database directly.' },
    { status: 403 }
  );
}
