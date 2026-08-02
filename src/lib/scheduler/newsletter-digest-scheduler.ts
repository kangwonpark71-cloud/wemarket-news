/**
 * Newsletter Digest Scheduler
 * Sends personalized newsletter digests (interest + keyword matched articles)
 * to subscribers daily at 7:00 AM by default.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { BaseScheduler, type SchedulerConfig } from './base-scheduler';
import { getSubscriberCount } from '@/lib/services/newsletter/newsletter-service';
import { sendDigestToAll } from '@/lib/services/newsletter/digest-service';
import { runJobWithLock } from '@/lib/utils/lock';
import { createLogger } from '@/lib/logger';

const log = createLogger('NewsletterDigestScheduler');

export interface NewsletterDigestSchedulerConfig extends SchedulerConfig {
  cronExpression: string;
  initialDelay: number;
  lockTimeout: number;
}

const defaultConfig: NewsletterDigestSchedulerConfig = {
  name: 'newsletter-digest',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  cronExpression: '0 7 * * *', // Daily at 7:00 AM (before the 8:00 AM general newsletter)
  initialDelay: 120000, // 2 minutes after startup
  lockTimeout: 600, // 10 minutes
};

export class NewsletterDigestScheduler extends BaseScheduler {
  private cronTask: ScheduledTask | null = null;

  constructor(config: Partial<NewsletterDigestSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config };
    super(fullConfig);
  }

  private get mConfig(): NewsletterDigestSchedulerConfig {
    return this.config as NewsletterDigestSchedulerConfig;
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

    log.info(`Starting newsletter digest scheduler (cron: ${this.mConfig.cronExpression})...`);

    this.cronTask = cron.schedule(this.mConfig.cronExpression, async () => {
      await this.executeJob(
        'newsletter-digest',
        async () => {
          await runJobWithLock('newsletter-digest', () => this.runDigest(), this.mConfig.lockTimeout);
        },
        {
          retryCount: 1,
          retryDelay: 60000,
          timeout: 600000,
        },
      );
    });

    // Report readiness after initial delay (no auto-send on startup — cron only)
    setTimeout(async () => {
      const count = await getSubscriberCount();
      log.info(`Newsletter digest scheduler ready — ${count} active subscribers`);
    }, this.mConfig.initialDelay);

    log.info(`Newsletter digest scheduler started (cron: ${this.mConfig.cronExpression})`);
  }

  async stop(): Promise<void> {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    log.info('Newsletter digest scheduler stopped');
  }

  private async runDigest(): Promise<void> {
    try {
      const count = await getSubscriberCount();
      if (count === 0) {
        log.info('No active subscribers, skipping digest');
        return;
      }

      log.info(`Preparing personalized digest for ${count} subscribers...`);

      const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const result = await sendDigestToAll(`[경제뉴스] 맞춤형 뉴스 다이제스트 — ${today}`);

      log.info(
        `Digest sent: ${result.sent} delivered, ${result.failed} failed` +
          (result.errors.length > 0 ? `, first error: ${result.errors[0]}` : ''),
      );
    } catch (error) {
      log.error('Digest run failed:', error);
      throw error;
    }
  }
}
