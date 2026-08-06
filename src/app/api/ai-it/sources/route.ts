import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { getActiveAIITSources, getAIITSourceByNameEn, upsertAIITSource } from '@/lib/ai-it/db-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAiitSources')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as 'ai' | 'it' | null;
    const nameEn = searchParams.get('nameEn');

    if (nameEn) {
      const source = await getAIITSourceByNameEn(nameEn);
      if (!source) {
        return apiError('Source not found', 404);
      }
      return NextResponse.json({ success: true, source });
    }

    const sources = await getActiveAIITSources(category || undefined);
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    log.error('[API] AI/IT Sources error:', error);
    return apiError('Failed to fetch sources', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameEn, url, category, subcategory, language, icon, fetchInterval } = body;

    if (!name || !nameEn || !url || !category || !subcategory) {
      return apiError('Missing required fields', 400);
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
    log.error('[API] AI/IT Sources create error:', error);
    return apiError('Failed to create source', 500);
  }
}