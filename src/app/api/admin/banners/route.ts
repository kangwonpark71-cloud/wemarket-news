import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { isBannerPosition } from '@/lib/constants/banner';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminBanners')

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

  const { searchParams } = new URL(request.url);
  const position = searchParams.get('position') || '';

  try {
    const where: Record<string, unknown> = {};
    if (position) where.position = position;

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, banners });
  } catch (error) {
    log.error('Banners list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load banners' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, imageUrl, linkUrl, position, sortOrder, isActive, startDate, endDate } = await request.json();

    if (!title || !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Title and imageUrl are required' },
        { status: 400 }
      );
    }

    const resolvedPosition = isBannerPosition(position) ? position : 'top';

    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl: linkUrl || null,
        position: resolvedPosition,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ success: true, banner }, { status: 201 });
  } catch (error) {
    log.error('Banner create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create banner' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, title, imageUrl, linkUrl, position, sortOrder, isActive, startDate, endDate } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Banner ID is required' }, { status: 400 });
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
        ...(position !== undefined && {
          position: isBannerPosition(position) ? position : 'top',
        }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    return NextResponse.json({ success: true, banner });
  } catch (error) {
    log.error('Banner update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Banner ID is required' }, { status: 400 });
    }

    await prisma.banner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Banner delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete banner' }, { status: 500 });
  }
}
