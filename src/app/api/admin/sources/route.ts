import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSessionUser } from '@/lib/utils/auth'

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, sources })
  } catch (error) {
    console.error('Failed to fetch admin sources:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json()
    const { id, fetchInterval, isActive } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Source ID is required' },
        { status: 400 }
      )
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
    console.error('Failed to update source config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update source' },
      { status: 500 }
    )
  }
}