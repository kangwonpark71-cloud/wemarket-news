import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/utils/auth';

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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const search = searchParams.get('search') || '';
  const sourceId = searchParams.get('sourceId') || '';
  const category = searchParams.get('category') || '';
  const sourceType = searchParams.get('sourceType') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'publishedAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

  try {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (sourceId) where.sourceId = sourceId;
    if (category) where.category = category;
    if (sourceType) where.sourceType = sourceType;
    if (status === 'read') where.isRead = true;
    if (status === 'unread') where.isRead = false;
    if (status === 'bookmarked') where.isBookmarked = true;

    const validSortFields = ['publishedAt', 'fetchedAt', 'title', 'category'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'publishedAt';

    const [articles, total, sources] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          url: true,
          category: true,
          sourceType: true,
          language: true,
          isRead: true,
          isBookmarked: true,
          publishedAt: true,
          fetchedAt: true,
          source: { select: { id: true, name: true, nameEn: true } },
        },
      }),
      prisma.article.count({ where }),
      prisma.source.findMany({
        select: { id: true, name: true, nameEn: true, sourceType: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        articles,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        sources,
      },
    });
  } catch (error) {
    console.error('Admin articles error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'articleId is required' },
        { status: 400 }
      );
    }

    await prisma.article.delete({ where: { id: articleId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin articles delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
