import { NextRequest, NextResponse } from 'next/server';
import { getActiveAIITSources, getAIITSourceByNameEn, upsertAIITSource } from '@/lib/ai-it/db-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const nameEn = searchParams.get('nameEn');

    if (nameEn) {
      const source = await getAIITSourceByNameEn(nameEn);
      if (!source) {
        return NextResponse.json({ success: false, error: 'Source not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, source });
    }

    const sources = await getActiveAIITSources(category || undefined);
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error('[API] AI/IT Sources error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameEn, url, category, subcategory, language, icon, fetchInterval } = body;

    if (!name || !nameEn || !url || !category || !subcategory) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = await upsertAIITSource({
      name,
      nameEn,
      url,
      category,
      subcategory,
      language: language || 'en',
      icon,
      fetchInterval,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[API] AI/IT Sources create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create source' },
      { status: 500 }
    );
  }
}