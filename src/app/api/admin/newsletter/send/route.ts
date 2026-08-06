import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/utils/auth';
import { prisma } from '@/lib/db';
import {
  sendNewsletterToAll,
  sendTestNewsletter,
  generateNewsletterHtml,
  getSubscriberCount,
  getActiveSubscribers,
} from '@/lib/services/newsletter/newsletter-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('ApiAdminNewsletterSend');

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401);
  }

  try {
    const count = await getSubscriberCount();
    const subscribers = await getActiveSubscribers();

    // Get recent articles for preview
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const articles = await prisma.article.findMany({
      where: { publishedAt: { gte: oneDayAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: {
        title: true,
        url: true,
        summary: true,
        source: { select: { name: true, nameEn: true } },
        category: true,
        publishedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriberCount: count,
        subscribers: subscribers.map((s) => ({ id: s.id, email: s.email })),
        recentArticles: articles.length,
        smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      },
    });
  } catch (error) {
    log.error('Failed to get newsletter status:', error);
    return apiError('Failed to get newsletter status', 500);
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') {
    return apiError('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const { action, email, subject: customSubject } = body;

    if (action === 'test' && email) {
      // Send test email
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const articles = await prisma.article.findMany({
        where: { publishedAt: { gte: oneDayAgo } },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          title: true,
          url: true,
          summary: true,
          source: { select: { name: true, nameEn: true } },
          category: true,
          publishedAt: true,
        },
      });

      const newsletterArticles = articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: (a.summary as { summary3Line?: string } | null)?.summary3Line || null,
        source: a.source?.name || a.source?.nameEn || null,
        category: a.category,
        publishedAt: a.publishedAt,
      }));

      const { html, text } = await generateNewsletterHtml(newsletterArticles);
      const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const result = await sendTestNewsletter(
        email,
        customSubject || `[경제뉴스] 오늘의 경제 뉴스 — ${today} (테스트)`,
        html,
        text,
      );

      if (!result.success) {
        return apiError(result.error ?? '테스트 뉴스레터 발송에 실패했습니다.', 500);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'send-all') {
      // Send to all subscribers
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const articles = await prisma.article.findMany({
        where: { publishedAt: { gte: oneDayAgo } },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: {
          title: true,
          url: true,
          summary: true,
          source: { select: { name: true, nameEn: true } },
          category: true,
          publishedAt: true,
        },
      });

      if (articles.length === 0) {
        return apiError('최근 24시간 내 발행된 기사가 없습니다.', 400);
      }

      const newsletterArticles = articles.map((a) => ({
        title: a.title,
        url: a.url,
        summary: (a.summary as { summary3Line?: string } | null)?.summary3Line || null,
        source: a.source?.name || a.source?.nameEn || null,
        category: a.category,
        publishedAt: a.publishedAt,
      }));

      const { html, text } = await generateNewsletterHtml(newsletterArticles);
      const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const result = await sendNewsletterToAll(
        customSubject || `[경제뉴스] 오늘의 경제 뉴스 — ${today} (${articles.length}개)`,
        html,
        text,
      );

      return NextResponse.json({ success: true, data: result });
    }

    return apiError('Invalid action. Use "test" or "send-all".', 400);
  } catch (error) {
    log.error('Newsletter send error:', error);
    return apiError('뉴스레터 발송에 실패했습니다.', 500);
  }
}
