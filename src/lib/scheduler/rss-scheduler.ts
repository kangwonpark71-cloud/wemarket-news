/**
 * RSS Scheduler Implementation
 * Handles RSS feed fetching with configurable intervals
 */

import cron from 'node-cron'
import { BaseScheduler, SchedulerConfig } from './base-scheduler'
import { runRssFetch } from '@/lib/rss/scheduler'
import { runJobWithLock } from '@/lib/utils/lock'

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
  private config: RSSSchedulerConfig
  private cronTask: cron.ScheduledTask | null = null

  constructor(config: Partial<RSSSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config }
    super(fullConfig)
    this.config = fullConfig
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[${this.config.name}] Scheduler is disabled`)
      return
    }

    if (this.cronTask) {
      console.warn(`[${this.config.name}] Scheduler already started`)
      return
    }

    console.log(`[${this.config.name}] Starting scheduler with interval: ${this.config.fetchInterval}`)

    // Schedule cron job
    this.cronTask = cron.schedule(this.config.fetchInterval, async () => {
      await this.runFetchJob()
    })

    // Initial fetch after delay
    setTimeout(async () => {
      await this.runFetchJob()
    }, this.config.initialDelay)

    console.log(`[${this.config.name}] Scheduler started`)
  }

  async stop(): Promise<void> {
    if (this.cronTask) {
      this.cronTask.stop()
      this.cronTask = null
      console.log(`[${this.config.name}] Scheduler stopped`)
    }
  }

  private async runFetchJob(): Promise<void> {
    await this.executeJob(
      'fetch',
      async () => {
        const results = await runJobWithLock(
          'rss',
          async () => {
            return await runRssFetch()
          },
          this.config.lockTimeout
        )

        if (!results) {
          throw new Error('Failed to acquire lock')
        }

        const successCount = results.filter(r => r.status === 'success' || r.status === 'partial').length
        const errorCount = results.filter(r => r.status === 'error').length

        console.log(`[${this.config.name}] Fetch completed: ${successCount} success, ${errorCount} errors`)

        return results
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
    console.log(`[${this.config.name}] Manual fetch triggered`)
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
      config: this.config,
    }
  }
}
