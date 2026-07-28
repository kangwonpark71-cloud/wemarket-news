import prisma from '@/lib/db';
import { summarizeWithLLMFallback } from './llm-service';
import type { AISummaryResult } from '../ai-it/summary-service';
import { parseList } from '@/lib/utils/list-fields';

export type TranslationResult = AISummaryResult;

export async function translateArticle(articleId: string): Promise<TranslationResult | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { summary: true },
  });

  if (!article) return null;
  if (article.language !== 'en') return null;

  if (article.summary?.translatedTitle) {
    return {
      translatedTitle: article.summary.translatedTitle,
      summary3Line: article.summary.summary3Line,
      keywords: parseList(article.summary.keywords),
      relatedCompanies: parseList(article.summary.relatedCompanies),
      relatedModels: parseList(article.summary.relatedModels),
      difficulty: (article.summary.difficulty as TranslationResult['difficulty']) || 'intermediate',
    };
  }

  const result = await summarizeWithLLMFallback(
    article.title,
    article.description || undefined,
    article.content || undefined,
  );

  const summaryData = {
    translatedTitle: result.translatedTitle,
    summary3Line: result.summary3Line,
    keywords: result.keywords,
    relatedCompanies: result.relatedCompanies,
    relatedModels: result.relatedModels,
    difficulty: result.difficulty,
    aiGenerated: true,
    modelUsed: 'gpt-4o-mini',
  };

  if (article.summary) {
    await prisma.newsSummary.update({
      where: { articleId: article.id },
      data: summaryData,
    });
  } else {
    await prisma.newsSummary.create({
      data: { articleId: article.id, ...summaryData },
    });
  }

  return result;
}

export async function translateArticleBatch(
  articleIds: string[],
): Promise<{ translated: number; failed: number }> {
  let translated = 0;
  let failed = 0;

  const existing = await prisma.newsSummary.findMany({
    where: { articleId: { in: articleIds } },
    select: { articleId: true, translatedTitle: true },
  });
  const completeSet = new Set(
    existing.filter(s => s.translatedTitle).map((s) => s.articleId)
  );

  const untranslated = articleIds.filter((id) => !completeSet.has(id));

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

/**
 * Quick title-only translation — faster and cheaper than full article translation.
 * Used for on-demand translate button clicks. Falls back to full translation
 * if the article already has a summary (returns the cached translatedTitle).
 */
export async function translateArticleTitleOnly(articleId: string): Promise<TranslationResult | null> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { summary: true },
  });

  if (!article) return null;
  if (article.language !== 'en') return null;

  // If already have a full summary, just return it
  if (article.summary?.translatedTitle) {
    return {
      translatedTitle: article.summary.translatedTitle,
      summary3Line: article.summary.summary3Line,
      keywords: parseList(article.summary.keywords),
      relatedCompanies: parseList(article.summary.relatedCompanies),
      relatedModels: parseList(article.summary.relatedModels),
      difficulty: (article.summary.difficulty as TranslationResult['difficulty']) || 'intermediate',
      aiGenerated: article.summary.aiGenerated || true,
      modelUsed: article.summary.modelUsed || 'gpt-4o-mini',
    };
  }

  // Quick title-only LLM call — minimal tokens (~100 tokens vs 500+ for full)
  const { translateTitleQuick, summarizeWithLLMFallback } = await import('./llm-service');
  let translatedTitle: string;
  try {
    translatedTitle = await translateTitleQuick(article.title);
  } catch {
    const result = await summarizeWithLLMFallback(
      article.title,
      article.description || undefined,
      article.content || undefined,
    );
    translatedTitle = result.translatedTitle || article.title;
  }

  // Lightweight summary (best-effort, separate try/catch so title translation is never blocked)
  let summary3Line = '';
  let keywords: string[] = [];
  try {
    const fullResult = await summarizeWithLLMFallback(
      article.title,
      article.description || undefined,
      undefined,
    );
    summary3Line = fullResult.summary3Line || '';
    keywords = fullResult.keywords || [];
  } catch {
  }

  await prisma.newsSummary.upsert({
    where: { articleId: article.id },
    update: {
      translatedTitle,
      summary3Line: summary3Line || '요약 준비 중',
      keywords: keywords || [],
      relatedCompanies: [],
      relatedModels: [],
      difficulty: 'intermediate',
      aiGenerated: true,
      modelUsed: 'gpt-4o-mini',
    },
    create: {
      articleId: article.id,
      translatedTitle,
      summary3Line: summary3Line || '요약 준비 중',
      keywords: keywords || [],
      relatedCompanies: [],
      relatedModels: [],
      difficulty: 'intermediate',
      aiGenerated: true,
      modelUsed: 'gpt-4o-mini',
    },
  });

  return {
    translatedTitle,
    summary3Line: summary3Line || '요약 준비 중',
    keywords,
    relatedCompanies: [],
    relatedModels: [],
    difficulty: 'intermediate',
    aiGenerated: true,
    modelUsed: 'gpt-4o-mini',
  };
}

export async function translateUntranslatedOverseas(
  limit: number = 50,
): Promise<{ translated: number; failed: number; total: number }> {
  const articles = await prisma.article.findMany({
    where: {
      language: 'en',
      OR: [
        { summary: null },
        { summary: { translatedTitle: null } },
      ],
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
