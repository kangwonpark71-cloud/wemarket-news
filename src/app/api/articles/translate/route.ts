import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { translateArticle, translateArticleTitleOnly } from '@/lib/ai/translation-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiArticlesTranslate')

export async function POST(request: Request) {
  try {
    const { articleId, mode = 'full' } = await request.json();

    if (!articleId || typeof articleId !== 'string') {
      return apiError('articleId is required', 400);
    }

    const result = mode === 'title'
      ? await translateArticleTitleOnly(articleId)
      : await translateArticle(articleId);

    if (!result) {
      return apiError('Article not found or not translatable', 404);
    }

    return NextResponse.json({ success: true, translation: result });
  } catch (error) {
    log.error('[POST /api/articles/translate]', error);
    return apiError('Translation failed', 500);
  }
}
