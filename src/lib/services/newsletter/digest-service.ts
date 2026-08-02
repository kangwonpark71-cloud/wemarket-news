/**
 * Personalized Newsletter Digest Service
 * Sends interest-based personalized newsletter digests to subscribers.
 * Each subscriber receives articles matched against their interests & alert keywords.
 */

import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  generateNewsletterHtml,
  getConfig,
  getTransporter,
  type NewsletterArticle,
  type SendResult,
} from './newsletter-service';
import { INTEREST_BY_ID, parseInterests, parseKeywords } from './newsletter-options';

const log = createLogger('NewsletterDigestService');

export interface DigestOptions {
  maxArticles?: number;
  sinceHours?: number;
}

export interface DigestSubscriber {
  id: string;
  email: string;
  interests: string;
  alertKeywords: string;
}

const DEFAULT_MAX_ARTICLES = 10;
const DEFAULT_SINCE_HOURS = 24;
const CANDIDATE_POOL_SIZE = 100;
const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 1000;

/**
 * Score a candidate article against the subscriber's interest keywords and alert keywords.
 * Returns a non-negative match score (0 = no match).
 */
function scoreArticle(
  article: {
    title: string;
    description: string | null;
    category: string | null;
  },
  interestKeywordSet: Set<string>,
  alertKeywords: string[],
): number {
  const title = article.title.toLowerCase();
  const description = (article.description || '').toLowerCase();
  const category = (article.category || '').toLowerCase();

  let score = 0;

  // Interest keyword matches
  for (const kw of interestKeywordSet) {
    if (title.includes(kw)) score += 3;
    else if (category.includes(kw)) score += 2;
    else if (description.includes(kw)) score += 1;
  }

  // Alert keyword matches (stronger signal — user explicitly asked)
  for (const kw of alertKeywords) {
    if (kw.length < 2) continue;
    if (title.includes(kw)) score += 5;
    else if (description.includes(kw)) score += 2;
  }

  return score;
}

/**
 * Build a personalized article list for one subscriber profile.
 * - Scores recent articles against interests + alert keywords
 * - Always falls back to top-viewed articles so the digest is never empty
 */
export async function getDigestArticlesForSubscriber(
  interests: string,
  alertKeywords: string,
  options: DigestOptions = {},
): Promise<NewsletterArticle[]> {
  const maxArticles = options.maxArticles ?? DEFAULT_MAX_ARTICLES;
  const sinceHours = options.sinceHours ?? DEFAULT_SINCE_HOURS;

  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: CANDIDATE_POOL_SIZE,
    select: {
      id: true,
      title: true,
      url: true,
      description: true,
      summary: true,
      category: true,
      source: { select: { name: true, nameEn: true } },
      publishedAt: true,
      viewCount: true,
    },
  });

  if (articles.length === 0) return [];

  const interestIds = parseInterests(interests);
  const alertKeywordList = parseKeywords(alertKeywords);

  const interestKeywordSet = new Set<string>();
  for (const id of interestIds) {
    const opt = INTEREST_BY_ID.get(id);
    if (opt) opt.keywords.forEach((k) => interestKeywordSet.add(k.toLowerCase()));
  }

  const scored = articles
    .map((a) => ({
      article: a,
      score: scoreArticle(a, interestKeywordSet, alertKeywordList),
    }))
    .sort((a, b) => b.score - a.score || b.article.publishedAt.getTime() - a.article.publishedAt.getTime());

  // Prefer matched articles; fall back to top-viewed when nothing matched
  const selected = scored.some((s) => s.score > 0)
    ? scored.filter((s) => s.score > 0).slice(0, maxArticles)
    : scored.slice(0, maxArticles);

  return selected.map(({ article: a }) => ({
    title: a.title,
    url: a.url,
    summary: (a.summary as { summary3Line?: string } | null)?.summary3Line || null,
    source: a.source?.name || a.source?.nameEn || null,
    category: a.category,
    publishedAt: a.publishedAt,
  }));
}

/**
 * Send a personalized digest to every active subscriber.
 * Each subscriber gets their own article selection + subject line.
 */
export async function sendDigestToAll(
  baseSubject: string,
  options: DigestOptions = {},
): Promise<SendResult> {
  const transport = getTransporter();
  if (!transport) {
    log.warn('SMTP not configured — skipping digest send. Set SMTP_HOST/SMTP_USER/SMTP_PASS env vars.');
    return { sent: 0, failed: 0, errors: ['SMTP not configured'] };
  }

  const config = getConfig()!;
  const subscribers = (await prisma.newsletterSubscription.findMany({
    where: { isActive: true },
    select: { id: true, email: true, interests: true, alertKeywords: true },
  })) as DigestSubscriber[];

  if (subscribers.length === 0) {
    log.info('No active subscribers — nothing to send');
    return { sent: 0, failed: 0, errors: [] };
  }

  log.info(`Sending personalized digest to ${subscribers.length} subscribers...`);

  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://economy-news.app';
  const listUnsubscribe = `<${baseUrl}/api/newsletter/unsubscribe>`;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          const articles = await getDigestArticlesForSubscriber(
            sub.interests,
            sub.alertKeywords,
            options,
          );
          if (articles.length === 0) {
            log.info(`No articles for ${sub.email} — skipping`);
            return;
          }

          const { html, text } = await generateNewsletterHtml(articles);
          const personalHtml = html.split('{{email}}').join(encodeURIComponent(sub.email));
          const personalText = text.split('{{email}}').join(sub.email);

          await transport.sendMail({
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to: sub.email,
            subject: baseSubject,
            text: personalText,
            html: personalHtml,
            headers: { 'List-Unsubscribe': listUnsubscribe },
          });
          result.sent++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error(`Failed to send digest to ${sub.email}: ${msg}`);
          result.failed++;
          result.errors.push(`${sub.email}: ${msg}`);
        }
      }),
    );

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  log.info(`Digest send complete: ${result.sent} sent, ${result.failed} failed`);
  return result;
}

/**
 * Send a personalized test digest to a single email using the full interest profile.
 */
export async function sendDigestTest(
  email: string,
  subject: string,
  options: DigestOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();
  if (!transport) return { success: false, error: 'SMTP not configured' };

  const config = getConfig()!;

  try {
    const allInterests = Array.from(INTEREST_BY_ID.keys()).join(',');
    const articles = await getDigestArticlesForSubscriber(allInterests, '', options);
    const { html, text } = await generateNewsletterHtml(articles);

    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: email,
      subject: `[테스트] ${subject}`,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export interface DigestStats {
  totalSubscribers: number;
  withPreferences: number;
  interests: { id: string; label: string; count: number }[];
}

/**
 * Aggregate stats for the admin page: how many subscribers have preferences,
 * and how many subscribers selected each interest.
 */
export async function getDigestStats(): Promise<DigestStats> {
  const subscribers = (await prisma.newsletterSubscription.findMany({
    where: { isActive: true },
    select: { interests: true, alertKeywords: true },
  })) as Pick<DigestSubscriber, 'interests' | 'alertKeywords'>[];

  const counts = new Map<string, number>();
  let withPreferences = 0;

  for (const sub of subscribers) {
    const ids = parseInterests(sub.interests);
    if (ids.length > 0 || parseKeywords(sub.alertKeywords).length > 0) withPreferences++;
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }

  return {
    totalSubscribers: subscribers.length,
    withPreferences,
    interests: Array.from(INTEREST_BY_ID.values()).map((opt) => ({
      id: opt.id,
      label: opt.label,
      count: counts.get(opt.id) || 0,
    })),
  };
}
