import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-response'
import prisma from '@/lib/db'
import { getSessionUser } from '@/lib/utils/auth'
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminSources')

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, sources })
  } catch (error) {
    log.error('Failed to fetch admin sources:', error)
    return apiError('Failed to fetch sources', 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = await request.json()
    const { id, fetchInterval, isActive } = body

    if (!id) {
      return apiError('Source ID is required', 400)
    }

    const updatedSource = await prisma.source.update({
      where: { id },
      data: {
        ...(fetchInterval !== undefined && { fetchInterval: parseInt(fetchInterval, 10) }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
    })

    return NextResponse.json({ success: true, source: updatedSource })
  } catch (error) {
    log.error('Failed to update source config:', error)
    return apiError('Failed to update source', 500)
  }
}