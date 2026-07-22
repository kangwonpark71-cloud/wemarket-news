/**
 * AI/IT Scheduler Implementation
 * Handles AI/IT news fetching with tiered intervals (15/30/60 min)
 */

import cron, { type ScheduledTask } from 'node-cron'
import { BaseScheduler, type SchedulerConfig } from './base-scheduler'
import {
  run15MinJob,
  run30MinJob,
  run60MinJob,
  fetchAllAIITNews,
  seedAIITSourcesIfEmpty,
} from '@/lib/ai-it/scheduler-service'
import { runJobWithLock } from '@/lib/utils/lock'

export interface AIITSchedulerConfig extends SchedulerConfig {
  highPriorityInterval: string   // cron: default '*/15 * * * *'
  midPriorityInterval: string    // cron: default '*/30 * * * *'
  lowPriorityInterval: string    // cron: default '*/60 * * * *'
  initialDelay: number           // ms
  lockTimeout: number            // seconds
}

const defaultConfig: AIITSchedulerConfig = {
  name: 'ai-it',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  highPriorityInterval: '*/15 * * * *',
  midPriorityInterval: '*/30 * * * *',
  lowPriorityInterval: '*/60 * * * *',
  initialDelay: 5000,
  lockTimeout: 300,
}

export class AIITScheduler extends BaseScheduler {
  private cronTasks: ScheduledTask[] = []

  constructor(config: Partial<AIITSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config }
    super(fullConfig)
  }

  private get aiConfig(): AIITSchedulerConfig {
    return this.config as AIITSchedulerConfig
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[${this.config.name}] Scheduler is disabled`)
      return
    }

    if (this.cronTasks.length > 0) {
      console.warn(`[${this.config.name}] Scheduler already started`)
      return
    }

    console.log(`[${this.config.name}] Starting scheduler...`)

    // High priority: every 15 minutes (OpenAI, Anthropic, Google AI, DeepMind)
    this.cronTasks.push(
      cron.schedule(this.aiConfig.highPriorityInterval, async () => {
        await this.runWithLock('ai-it:15min', () => run15MinJob())
      })
    )

    // Mid priority: every 30 minutes (Microsoft, Meta, NVIDIA, HuggingFace)
    this.cronTasks.push(
      cron.schedule(this.aiConfig.midPriorityInterval, async () => {
        await this.runWithLock('ai-it:30min', () => run30MinJob())
      })
    )

    // Low priority: every 60 minutes (all other sources)
    this.cronTasks.push(
      cron.schedule(this.aiConfig.lowPriorityInterval, async () => {
        await this.runWithLock('ai-it:60min', () => run60MinJob())
      })
    )

    // Initial fetch after delay
    setTimeout(async () => {
      await runJobWithLock('ai-it:initial', async () => {
        await fetchAllAIITNews()
      }).catch(err => console.error(`[${this.config.name}] Initial fetch error:`, err))
    }, this.aiConfig.initialDelay)

    // Seed sources
    setTimeout(async () => {
      await seedAIITSourcesIfEmpty().catch(() => {})
    }, 3000)

    console.log(`[${this.config.name}] Scheduler started`)
  }

  async stop(): Promise<void> {
    for (const task of this.cronTasks) {
      task.stop()
    }
    this.cronTasks = []
    console.log(`[${this.config.name}] Scheduler stopped`)
  }

  private async runWithLock(name: string, jobFn: () => Promise<void>): Promise<void> {
    await this.executeJob(
      name,
      async () => {
        const lockName = `scheduler:job:${name}`
        const acquired = await this.acquireLock(lockName)

        if (!acquired) {
          console.log(`[${this.config.name}] Could not acquire lock for ${name}, skipping`)
          return
        }

        try {
          await jobFn()
        } finally {
          setTimeout(() => {
            this.releaseLock(lockName).catch(() => {})
          }, 5000)
        }
      },
      {
        retryCount: 1,
        retryDelay: 10000,
        timeout: 300000,
      }
    )
  }

  private async acquireLock(name: string): Promise<boolean> {
    try {
      const { cacheService } = await import('@/lib/services/cache/cache-service')
      return await cacheService.acquireLock(name, this.aiConfig.lockTimeout)
    } catch {
      return true // If cache unavailable, proceed without lock
    }
  }

  private async releaseLock(name: string): Promise<void> {
    try {
      const { cacheService } = await import('@/lib/services/cache/cache-service')
      await cacheService.releaseLock(name)
    } catch {
      // Ignore
    }
  }
}
