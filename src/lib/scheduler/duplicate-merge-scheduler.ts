/**
 * Duplicate Merge Scheduler
 * Periodically finds and merges duplicate articles to keep the DB clean.
 * Runs every 3 hours by default.
 */

import cron, { type ScheduledTask } from 'node-cron'
import { BaseScheduler, type SchedulerConfig } from './base-scheduler'
import { mergeDuplicates } from '@/lib/services/duplicate/duplicate-service'
import { runJobWithLock } from '@/lib/utils/lock'
import { createLogger } from '@/lib/logger'

const log = createLogger('DuplicateMergeScheduler')

export interface DuplicateMergeSchedulerConfig extends SchedulerConfig {
  cronExpression: string
  initialDelay: number
  lockTimeout: number
}

const defaultConfig: DuplicateMergeSchedulerConfig = {
  name: 'duplicate-merge',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  cronExpression: '0 */3 * * *',
  initialDelay: 60000, // 1 minute after startup
  lockTimeout: 600,    // 10 minutes
}

export class DuplicateMergeScheduler extends BaseScheduler {
  private cronTask: ScheduledTask | null = null

  constructor(config: Partial<DuplicateMergeSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config }
    super(fullConfig)
  }

  private get mConfig(): DuplicateMergeSchedulerConfig {
    return this.config as DuplicateMergeSchedulerConfig
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

    log.info('Starting duplicate merge scheduler...')

    // Run on cron schedule
    this.cronTask = cron.schedule(this.mConfig.cronExpression, async () => {
      await this.executeJob(
        'duplicate-merge',
        async () => {
          await runJobWithLock('duplicate-merge', () => this.runMerge(), this.mConfig.lockTimeout)
        },
        {
          retryCount: 1,
          retryDelay: 30000,
          timeout: 300000, // 5 min timeout
        },
      )
    })

    // Also run once after initial delay
    setTimeout(async () => {
      log.info('Running initial duplicate merge...')
      const acquired = await runJobWithLock('duplicate-merge:initial', () => this.runMerge(), this.mConfig.lockTimeout)
      if (!acquired) {
        log.info('Could not acquire lock for initial merge, will wait for cron')
      }
    }, this.mConfig.initialDelay)

    log.info(`Duplicate merge scheduler started (cron: ${this.mConfig.cronExpression})`)
  }

  async stop(): Promise<void> {
    if (this.cronTask) {
      this.cronTask.stop()
      this.cronTask = null
    }
    log.info('Duplicate merge scheduler stopped')
  }

  private async runMerge(): Promise<void> {
    try {
      log.info('Running duplicate article merge...')
      const result = await mergeDuplicates(false)
      log.info(
        `Merge complete: ${result.totalGroups} groups, ${result.totalDuplicates} duplicates removed` +
          (result.errors.length > 0 ? `, ${result.errors.length} errors` : ''),
      )
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 5)) {
          log.warn(`Merge error: ${err}`)
        }
      }
    } catch (error) {
      log.error('Duplicate merge failed:', error)
      throw error
    }
  }
}
