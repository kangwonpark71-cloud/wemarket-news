import Parser from 'rss-parser';

import { createLogger } from '@/lib/logger';
const log = createLogger('RSSHelper')

export function extractThumbnail(item: Record<string, unknown>): string | undefined {
  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;

  if (mediaContent?.$?.url) return mediaContent.$.url;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;
  return undefined;
}

export function extractCategory(item: Record<string, unknown>): string | undefined {
  const categories = item.categories;
  if (Array.isArray(categories) && categories.length > 0) {
    return categories[0];
  }
  if (typeof categories === 'string') {
    return categories;
  }
  return undefined;
}

export async function fetchWithRetry(
  parser: Parser,
  url: string,
  logPrefix: string = 'RSS Fetcher',
  retries: number = 3,
  baseDelay: number = 1000
): Promise<{ feed: Parser.Output<unknown> } | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      return { feed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        log.warn(`[${logPrefix}] Attempt ${attempt + 1} failed for ${url}: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          timer.unref?.();
        });
      }
    }
  }

  log.error(`[${logPrefix}] All ${retries + 1} attempts failed for ${url}: ${lastError?.message}`);
  return null;
}
