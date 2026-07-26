import { getActiveAIITSources, logAIITFetch, upsertAIITArticles, getAIITArticleByUrl, upsertSummary } from './db-service';
import { fetchAIITFeed } from './fetcher';
import { generateAISummaryWithLLM } from './summary-service';
import { processPendingTranslations } from '@/lib/rss/db-service';
import type { AIITSourceConfig } from './sources';

export async function fetchAndProcessSource(sourceId: string): Promise<{ count: number; newCount: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const sources = await getActiveAIITSources();
    const targetSource = sources.find(s => s.id === sourceId);
    if (!targetSource) {
      return { count: 0, newCount: 0, error: 'Source not found' };
    }
    
    const result = await fetchAIITFeed({
      name: targetSource.name,
      nameEn: targetSource.nameEn,
      url: targetSource.url,
      category: targetSource.category as 'ai' | 'it',
      subcategory: targetSource.subcategory || '',
      language: targetSource.language as 'ko' | 'en',
      fetchInterval: targetSource.fetchInterval,
      type: targetSource.fetchType as 'rss' | 'crawler',
      crawlerConfig: targetSource.crawlerConfig as AIITSourceConfig['crawlerConfig'],
    });
    
    if (result.error) {
      await logAIITFetch(sourceId, 'error', 0, 0, Date.now() - startTime, result.error);
      return { count: 0, newCount: 0, error: result.error };
    }
    
    const { newCount, totalCount } = await upsertAIITArticles(sourceId, result.articles);
    
    for (const article of result.articles) {
      try {
        const existing = await getAIITArticleByUrl(article.url);
        if (existing && !existing.summary) {
          const summary = await generateAISummaryWithLLM(article.title, article.description, article.content);
          await upsertSummary(existing.id, {
            translatedTitle: summary.translatedTitle,
            summary3Line: summary.summary3Line,
            keywords: summary.keywords,
            relatedCompanies: summary.relatedCompanies,
            relatedModels: summary.relatedModels,
            difficulty: summary.difficulty,
          });
          const { sendNotificationWebhook } = await import('@/lib/utils');
          await sendNotificationWebhook(article.title, article.url, targetSource.name, summary.summary3Line);
        }
      } catch (e) {
        console.warn('[AIITScheduler] Summary generation failed:', e);
      }
    }
    
    const status = newCount > 0 ? 'success' : 'partial';
    await logAIITFetch(sourceId, status, totalCount, newCount, Date.now() - startTime);
    
    return { count: totalCount, newCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAIITFetch(sourceId, 'error', 0, 0, Date.now() - startTime, errorMessage);
    return { count: 0, newCount: 0, error: errorMessage };
  }
}

export async function fetchAllAIITNews(): Promise<{ totalCount: number; totalNew: number; errors: number }> {
  try {
    const sources = await getActiveAIITSources();
    
    if (sources.length === 0) {
      return { totalCount: 0, totalNew: 0, errors: 0 };
    }
    
    let totalCount = 0;
    let totalNew = 0;
    let errors = 0;
    
    const concurrency = 5;
    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      
      const promises = batch.map(source => fetchAndProcessSource(source.id));
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalCount += result.value.count;
          totalNew += result.value.newCount;
          if (result.value.error) errors++;
        } else {
          errors++;
          console.error('[AIITScheduler] Source processing failed:', result.reason);
        }
      }
    }
    
    return { totalCount, totalNew, errors };
    } catch (error) {
      console.error('[AIITScheduler] Fatal error:', error);
      return { totalCount: 0, totalNew: 0, errors: 1 };
    } finally {
      processPendingTranslations().catch(() => {});
    }
  }

export async function fetchAIITNewsByCategory(category: 'ai' | 'it'): Promise<{ totalCount: number; totalNew: number }> {
  const sources = await getActiveAIITSources(category);
  
  let totalCount = 0;
  let totalNew = 0;
  
  for (const source of sources) {
    const result = await fetchAndProcessSource(source.id);
    totalCount += result.count;
    totalNew += result.newCount;
  }
  
  processPendingTranslations().catch(() => {});
  return { totalCount, totalNew };
}

export async function fetchAIITNewsBySubcategory(subcategory: string): Promise<{ totalCount: number; totalNew: number }> {
  const sources = await getActiveAIITSources();
  const filtered = sources.filter(s => s.subcategory === subcategory);
  
  let totalCount = 0;
  let totalNew = 0;
  
  for (const source of filtered) {
    const result = await fetchAndProcessSource(source.id);
    totalCount += result.count;
    totalNew += result.newCount;
  }
  
  return { totalCount, totalNew };
}

export async function run15MinJob(): Promise<void> {
  const sources = await getActiveAIITSources('ai');
  const prioritySources = sources.filter(s => 
    ['openai_blog', 'anthropic_news', 'google_ai_blog', 'deepmind_blog'].includes(s.nameEn)
  );
  
  for (const source of prioritySources) {
    await fetchAndProcessSource(source.id);
  }
}

export async function run30MinJob(): Promise<void> {
  const sources = await getActiveAIITSources('ai');
  const midPrioritySources = sources.filter(s => 
    ['microsoft_ai_blog', 'meta_ai_blog', 'nvidia_ai_blog', 'huggingface_blog'].includes(s.nameEn)
  );
  
  for (const source of midPrioritySources) {
    await fetchAndProcessSource(source.id);
  }
}

export async function run60MinJob(): Promise<void> {
  const sources = await getActiveAIITSources();
  const lowPrioritySources = sources.filter(s => 
    !['openai_blog', 'anthropic_news', 'google_ai_blog', 'deepmind_blog', 'microsoft_ai_blog', 'meta_ai_blog', 'nvidia_ai_blog', 'huggingface_blog'].includes(s.nameEn)
  );
  
  for (const source of lowPrioritySources) {
    await fetchAndProcessSource(source.id);
  }
}

export async function seedAIITSourcesIfEmpty(): Promise<void> {
  const { seedAIITSources } = await import('./db-service');
  await seedAIITSources();
}

export async function triggerFetch(sourceNameEn?: string): Promise<{ success: boolean; count: number; newCount: number }> {
  if (sourceNameEn) {
    const sources = await getActiveAIITSources();
    const target = sources.find(s => s.nameEn === sourceNameEn);
    if (target) {
      const result = await fetchAndProcessSource(target.id);
      return { success: !result.error, count: result.count, newCount: result.newCount };
    }
    return { success: false, count: 0, newCount: 0 };
  }
  
  const result = await fetchAllAIITNews();
  return { success: result.errors === 0, count: result.totalCount, newCount: result.totalNew };
}