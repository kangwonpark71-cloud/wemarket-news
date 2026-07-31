/**
 * Newsletter Scheduler
 * Periodically sends newsletters to subscribed users with recent articles.
 * Runs daily at 8:00 AM by default.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { BaseScheduler, type SchedulerConfig } from './base-scheduler';
import { prisma } from '@/lib/db';
import {
  sendNewsletterToAll,
  generateNewsletterHtml,
  getSubscriberCount,
} from '@/lib/services/newsletter/newsletter-service';
import { runJobWithLock } from '@/lib/utils/lock';
import { createLogger } from '@/lib/logger';

const log = createLogger('NewsletterScheduler');

export interface NewsletterSchedulerConfig extends SchedulerConfig {
  cronExpression: string;
  initialDelay: number;
  lockTimeout: number;
  maxArticles: number;
}

const defaultConfig: NewsletterSchedulerConfig = {
  name: 'newsletter',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  cronExpression: '0 8 * * *', // Daily at 8:00 AM
  initialDelay: 120000, // 2 minutes after startup
  lockTimeout: 600, // 10 minutes
  maxArticles: 10,
};

export class NewsletterScheduler extends BaseScheduler {
  private cronTask: ScheduledTask | null = null;

  constructor(config: Partial<NewsletterSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config };
    super(fullConfig);
  }

  private get mConfig(): NewsletterSchedulerConfig {
    return this.config as NewsletterSchedulerConfig;
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.info('Scheduler is disabled');
      return;
    }

    if (this.cronTask) {
      log.warn('Scheduler already started');
      return;
    }

    log.info(`Starting newsletter scheduler (cron: ${this.mConfig.cronExpression})...`);

    this.cronTask = cron.schedule(this.mConfig.cronExpression, async () => {
      await this.executeJob(
        'newsletter-send',
        async () => {
          await runJobWithLock('newsletter-send', () => this.runNewsletter(), this.mConfig.lockTimeout);
        },
        {
          retryCount: 1,
          retryDelay: 60000,
          timeout: 300000,
        },
      );
    });

    // Run once after initial delay
    setTimeout(async () => {
      const count = await getSubscriberCount();
      log.info(`Newsletter scheduler ready — ${count} active subscribers`);
      if (count > 0) {
        log.info('Skipping initial send (first send will be on cron schedule)');
      }
    }, this.mConfig.initialDelay);

    log.info(`Newsletter scheduler started (cron: ${this.mConfig.cronExpression})`);
  }

  async stop(): Promise<void> {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    log.info('Newsletter scheduler stopped');
  }

  private async runNewsletter(): Promise<void> {
    try {
      const count = await getSubscriberCount();
      if (count === 0) {
        log.info('No active subscribers, skipping newsletter');
        return;
      }

      log.info(`Preparing newsletter for ${count} subscribers...`);

      // Get recent articles from the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const articles = await prisma.article.findMany({
        where: { publishedAt: { gte: oneDayAgo } },
        orderBy: { publishedAt: 'desc' },
        take: this.mConfig.maxArticles,
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
        log.info('No recent articles to send');
        return;
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
        `[경제뉴스] 오늘의 경제 뉴스 — ${today} (${articles.length}개)`,
        html,
        text,
      );

      log.info(
        `Newsletter sent: ${result.sent} delivered, ${result.failed} failed` +
          (result.errors.length > 0 ? `, first error: ${result.errors[0]}` : ''),
      );
    } catch (error) {
      log.error('Newsletter run failed:', error);
      throw error;
    }
  }
}
