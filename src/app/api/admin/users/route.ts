import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminUsers')

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    log.error('Admin users list error:', error);
    return apiError('Failed to load users', 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const { userId, role } = await request.json();

    if (!userId || !role || !['USER', 'ADMIN'].includes(role)) {
      return apiError('Invalid request: userId and role (USER|ADMIN) required', 400);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    log.error('Admin users update error:', error);
    return apiError('Failed to update user', 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return apiError('Unauthorized', 401);
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return apiError('userId is required', 400);
    }

    if (userId === admin.id) {
      return apiError('Cannot delete your own account', 400);
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Admin users delete error:', error);
    return apiError('Failed to delete user', 500);
  }
}
