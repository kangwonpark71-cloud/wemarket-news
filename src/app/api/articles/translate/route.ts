import { NextResponse } from 'next/server';
import { translateArticle } from '@/lib/ai/translation-service';

export async function POST(request: Request) {
  try {
    const { articleId } = await request.json();

    if (!articleId || typeof articleId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'articleId is required' },
        { status: 400 },
      );
    }

    const result = await translateArticle(articleId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Article not found or not translatable' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, translation: result });
  } catch (error) {
    console.error('[POST /api/articles/translate]', error);
    return NextResponse.json(
      { success: false, error: 'Translation failed' },
      { status: 500 },
    );
  }
}
