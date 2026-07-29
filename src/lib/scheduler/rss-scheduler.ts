/**
 * RSS Scheduler Implementation
 * Handles RSS feed fetching with configurable intervals
 */

import cron, { type ScheduledTask } from 'node-cron'
import { BaseScheduler, SchedulerConfig } from './base-scheduler'
import { runRssFetch } from '@/lib/rss/scheduler'
import { cacheService } from '@/lib/services/cache/cache-service'
import { createLogger } from '@/lib/logger';

const log = createLogger('RSSScheduler')

export interface RSSSchedulerConfig extends SchedulerConfig {
  fetchInterval: string // cron expression
  initialDelay: number // ms
  lockTimeout: number // seconds
}

const defaultConfig: RSSSchedulerConfig = {
  name: 'rss',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  fetchInterval: '0 */3 * * *', // Every 3 hours
  initialDelay: 2000, // 2 seconds
  lockTimeout: 600, // 10 minutes
}

export class RSSScheduler extends BaseScheduler {
  private cronTask: ScheduledTask | null = null

  constructor(config: Partial<RSSSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config }
    super(fullConfig)
  }

  private get rssConfig(): RSSSchedulerConfig {
    return this.config as RSSSchedulerConfig
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.info('Scheduler is disabled')
      return
    }

    if (this.cronTask) {
      log.warn('Scheduler already started')
      return
    }

    log.info(`Starting scheduler with interval: ${this.rssConfig.fetchInterval}`)

    // Schedule cron job
    this.cronTask = cron.schedule(this.rssConfig.fetchInterval, async () => {
      await this.runFetchJob()
    })

    // Initial fetch after delay
    setTimeout(async () => {
      await this.runFetchJob()
    }, this.rssConfig.initialDelay)

    log.info('Scheduler started')
  }

  async stop(): Promise<void> {
    if (this.cronTask) {
      this.cronTask.stop()
      this.cronTask = null
      log.info('Scheduler stopped')
    }
  }

  private async runFetchJob(): Promise<void> {
    await this.executeJob(
      'fetch',
      async () => {
        const lockName = 'scheduler:job:rss'
        const acquired = await cacheService.acquireLock(lockName, this.rssConfig.lockTimeout)

        if (!acquired) {
          log.info(`Could not acquire lock, skipping`)
          return []
        }

        try {
          const results = await runRssFetch()

          if (results && results.length > 0) {
            const successCount = results.filter(r => r.status === 'success' || r.status === 'partial').length
            const errorCount = results.filter(r => r.status === 'error').length
            log.info(`Fetch completed: ${successCount} success, ${errorCount} errors`)
          }

          return results ?? []
        } finally {
          setTimeout(() => {
            cacheService.releaseLock(lockName).catch(() => {})
          }, 10000)
        }
      },
      {
        retryCount: 2,
        retryDelay: 5000,
        timeout: 300000, // 5 minutes
      }
    )
  }

  /**
   * Trigger immediate fetch (for manual triggers)
   */
  async triggerFetch(): Promise<void> {
    log.info('Manual fetch triggered')
    await this.runFetchJob()
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean
    nextRun?: Date
    config: RSSSchedulerConfig
  } {
    return {
      running: this.cronTask !== null,
      config: this.rssConfig,
    }
  }
}
