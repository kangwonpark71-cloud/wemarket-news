import prisma from '@/lib/db';
import { summarizeWithLLMFallback } from './llm-service';
import type { AISummaryResult } from '../ai-it/summary-service';

export type TranslationResult = AISummaryResult;

export async function translateArticle(articleId: string): Promise<TranslationResult | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { summary: true },
  });

  if (!article) return null;
  if (article.language !== 'en') return null;
  if (article.summary) {
    return {
      translatedTitle: article.summary.translatedTitle || undefined,
      summary3Line: article.summary.summary3Line,
      keywords: article.summary.keywords,
      relatedCompanies: article.summary.relatedCompanies,
      relatedModels: article.summary.relatedModels,
      difficulty: (article.summary.difficulty as TranslationResult['difficulty']) || 'intermediate',
    };
  }

  const result = await summarizeWithLLMFallback(
    article.title,
    article.description || undefined,
    article.content || undefined,
  );

  await prisma.newsSummary.create({
    data: {
      articleId: article.id,
      translatedTitle: result.translatedTitle,
      summary3Line: result.summary3Line,
      keywords: result.keywords,
      relatedCompanies: result.relatedCompanies,
      relatedModels: result.relatedModels,
      difficulty: result.difficulty,
      aiGenerated: true,
      modelUsed: 'gpt-4o-mini',
    },
  });

  return result;
}

export async function translateArticleBatch(
  articleIds: string[],
): Promise<{ translated: number; failed: number }> {
  let translated = 0;
  let failed = 0;

  const existing = await prisma.newsSummary.findMany({
    where: { articleId: { in: articleIds } },
    select: { articleId: true },
  });
  const existingSet = new Set(existing.map((s) => s.articleId));

  const untranslated = articleIds.filter((id) => !existingSet.has(id));

  for (const id of untranslated) {
    try {
      const result = await translateArticle(id);
      if (result) translated++;
      else failed++;
    } catch (err) {
      console.warn(`[Translation] Failed for article ${id}:`, err);
      failed++;
    }
  }

  return { translated, failed };
}

export async function translateUntranslatedOverseas(
  limit: number = 50,
): Promise<{ translated: number; failed: number; total: number }> {
  const articles = await prisma.article.findMany({
    where: {
      language: 'en',
      summary: null,
    },
    take: limit,
    orderBy: { publishedAt: 'desc' },
    select: { id: true },
  });

  if (articles.length === 0) return { translated: 0, failed: 0, total: 0 };

  const ids = articles.map((a) => a.id);
  const result = await translateArticleBatch(ids);

  return { ...result, total: articles.length };
}
