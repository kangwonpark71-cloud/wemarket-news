import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';
import { isAdType, isAdPosition } from '@/lib/constants/ads';
import { sanitizeAdHtml } from '@/lib/utils/sanitize';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminAds')

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

    const ads = await prisma.advertisement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const totalImpressions = ads.reduce((sum, a) => sum + a.impressions, 0);
    const totalClicks = ads.reduce((sum, a) => sum + a.clicks, 0);

    return NextResponse.json({ success: true, ads, totalImpressions, totalClicks });
  } catch (error) {
    log.error('Ads list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load ads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, adType, content, linkUrl, position, isActive, startDate, endDate } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    if (adType === 'image' && !content.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'Image ads require a valid URL for content' },
        { status: 400 }
      );
    }

    // Sanitize HTML content for defense-in-depth (also sanitized on read)
    const sanitizedContent = sanitizeAdHtml(content);

    const ad = await prisma.advertisement.create({
      data: {
        title,
        adType: isAdType(adType) ? adType : 'image',
        content: sanitizedContent,
        linkUrl: linkUrl || null,
        position: isAdPosition(position) ? position : 'sidebar',
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ success: true, ad }, { status: 201 });
  } catch (error) {
    log.error('Ad create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create ad' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, title, adType, content, linkUrl, position, isActive, startDate, endDate } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Ad ID is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      ...(title !== undefined && { title }),
      ...(adType !== undefined && { adType: isAdType(adType) ? adType : 'image' }),
      ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
      ...(position !== undefined && { position: isAdPosition(position) ? position : 'sidebar' }),
      ...(isActive !== undefined && { isActive }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    };

    if (content !== undefined) {
      data.content = sanitizeAdHtml(content);
    }

    const ad = await prisma.advertisement.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, ad });
  } catch (error) {
    log.error('Ad update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update ad' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Ad ID is required' }, { status: 400 });
    }

    await prisma.advertisement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Ad delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete ad' }, { status: 500 });
  }
}
