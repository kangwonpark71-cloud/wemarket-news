/**
 * Newsletter Service
 * Handles sending email newsletters to subscribed users.
 * Uses nodemailer for SMTP transport.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const log = createLogger('NewsletterService');

interface NewsletterConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

function getConfig(): NewsletterConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || user;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    fromName: process.env.NEWSLETTER_FROM_NAME || '경제뉴스',
    fromEmail: fromEmail || user,
  };
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const config = getConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  return transporter;
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

export interface NewsletterArticle {
  title: string;
  url: string;
  summary?: string | null;
  source?: string | null;
  category?: string | null;
  publishedAt?: Date | null;
}

/**
 * Get all active newsletter subscribers
 */
export async function getActiveSubscribers(): Promise<{ id: string; email: string }[]> {
  const subs = await prisma.newsletterSubscription.findMany({
    where: { isActive: true },
    select: { id: true, email: true },
  });
  return subs;
}

/**
 * Get subscriber count
 */
export async function getSubscriberCount(): Promise<number> {
  return prisma.newsletterSubscription.count({ where: { isActive: true } });
}

/**
 * Send newsletter to all active subscribers
 */
export async function sendNewsletterToAll(
  subject: string,
  htmlContent: string,
  textContent?: string,
): Promise<SendResult> {
  const transport = getTransporter();
  if (!transport) {
    log.warn('SMTP not configured — skipping newsletter send. Set SMTP_HOST/SMTP_USER/SMTP_PASS env vars.');
    return { sent: 0, failed: 0, errors: ['SMTP not configured'] };
  }

  const config = getConfig()!;
  const subscribers = await getActiveSubscribers();

  if (subscribers.length === 0) {
    log.info('No active subscribers — nothing to send');
    return { sent: 0, failed: 0, errors: [] };
  }

  log.info(`Sending newsletter to ${subscribers.length} subscribers...`);

  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  // Send in batches to avoid overwhelming the SMTP server
  const BATCH_SIZE = 25;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          await transport.sendMail({
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to: sub.email,
            subject,
            text: textContent || '',
            html: htmlContent,
            headers: {
              'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_BASE_URL || 'https://economy-news.app'}/api/newsletter/unsubscribe>`,
            },
          });
          result.sent++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error(`Failed to send newsletter to ${sub.email}: ${msg}`);
          result.failed++;
          result.errors.push(`${sub.email}: ${msg}`);
        }
      }),
    );

    // Small delay between batches
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  log.info(`Newsletter send complete: ${result.sent} sent, ${result.failed} failed`);
  return result;
}

/**
 * Send a test newsletter to a single email
 */
export async function sendTestNewsletter(
  email: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
): Promise<{ success: boolean; error?: string }> {
  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'SMTP not configured' };
  }

  const config = getConfig()!;

  try {
    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: email,
      subject: `[테스트] ${subject}`,
      text: textContent || '',
      html: htmlContent,
    });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Generate newsletter HTML from recent articles
 */
export async function generateNewsletterHtml(
  articles: NewsletterArticle[],
): Promise<{ html: string; text: string }> {
  const articleRows = articles
    .map(
      (a, i) => `
    <tr>
      <td style="padding: 16px 0; ${i > 0 ? 'border-top: 1px solid #e5e7eb;' : ''}">
        <a href="${a.url}" style="font-size: 16px; font-weight: 600; color: #1f2937; text-decoration: none; display: block; margin-bottom: 6px;">
          ${escapeHtml(a.title)}
        </a>
        <div style="font-size: 13px; color: #6b7280;">
          ${a.source ? `<span>${escapeHtml(a.source)}</span>` : ''}
          ${a.category ? `<span> · ${escapeHtml(a.category)}</span>` : ''}
          ${a.publishedAt ? `<span> · ${formatDate(a.publishedAt)}</span>` : ''}
        </div>
        ${a.summary ? `<p style="font-size: 14px; color: #4b5563; margin: 8px 0 0 0; line-height: 1.5;">${escapeHtml(a.summary)}</p>` : ''}
      </td>
    </tr>`,
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>경제뉴스</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">경제뉴스</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">주요 경제 뉴스를 한눈에</p>
            </td>
          </tr>
          <!-- Articles -->
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${articleRows}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                이 메일은 경제뉴스 뉴스레터를 구독하신 분께 발송됩니다.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://economy-news.app'}/api/newsletter/unsubscribe?email={{email}}" style="color: #6366f1; text-decoration: underline;">뉴스레터 구독 해지</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `경제뉴스\n\n${articles
    .map(
      (a) =>
        `${a.title}\n${a.source ? `${a.source}` : ''}${a.category ? ` - ${a.category}` : ''}${a.publishedAt ? ` - ${formatDate(a.publishedAt)}` : ''}\n${a.url}\n${a.summary ? `${a.summary}\n` : ''}`,
    )
    .join('\n---\n\n')}\n\n---\n구독 해지: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://economy-news.app'}/api/newsletter/unsubscribe`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
