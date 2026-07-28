/**
 * Scheduler Manager
 * Coordinates multiple schedulers and provides unified management
 */

import { BaseScheduler, SchedulerMetrics } from './base-scheduler'
import { RSSScheduler } from './rss-scheduler'
import { AIITScheduler } from './ai-it-scheduler'
import { FinancialScheduler } from './financial-scheduler'
import { createLogger } from '@/lib/logger'

const log = createLogger('SchedulerManager')

export interface SchedulerManagerConfig {
  enabled: boolean
  healthCheckInterval: number // ms
  maxRestartAttempts: number
  restartDelay: number // ms
}

interface SchedulerEntry {
  scheduler: BaseScheduler
  restartAttempts: number
  lastRestart?: Date
}

const defaultConfig: SchedulerManagerConfig = {
  enabled: true,
  healthCheckInterval: 300000, // 5 minutes
  maxRestartAttempts: 3,
  restartDelay: 60000, // 1 minute
}

export class SchedulerManager {
  private config: SchedulerManagerConfig
  private schedulers = new Map<string, SchedulerEntry>()
  private healthCheckTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<SchedulerManagerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Register a scheduler
   */
  register(name: string, scheduler: BaseScheduler): void {
    if (this.schedulers.has(name)) {
      log.warn(`Scheduler '${name}' already registered`)
      return
    }

    this.schedulers.set(name, {
      scheduler,
      restartAttempts: 0,
    })

    log.info(`Registered scheduler: ${name}`)
  }

  /**
   * Unregister a scheduler
   */
  unregister(name: string): void {
    this.schedulers.delete(name)
    log.info(`Unregistered scheduler: ${name}`)
  }

  /**
   * Start all schedulers
   */
  async startAll(): Promise<void> {
    if (!this.config.enabled) {
      log.info('Manager is disabled')
      return
    }

    log.info('Starting all schedulers...')

    const startPromises = Array.from(this.schedulers.entries()).map(async ([name, entry]) => {
      try {
        await entry.scheduler.start()
        log.info(`Started scheduler: ${name}`)
      } catch (error) {
        log.error(`Failed to start scheduler '${name}':`, error)
      }
    })

    await Promise.allSettled(startPromises)

    // Start health checks
    this.startHealthChecks()

    log.info('All schedulers started')
  }

  /**
   * Stop all schedulers
   */
  async stopAll(): Promise<void> {
    log.info('Stopping all schedulers...')

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }

    const stopPromises = Array.from(this.schedulers.entries()).map(async ([name, entry]) => {
      try {
        await entry.scheduler.stop()
        log.info(`Stopped scheduler: ${name}`)
      } catch (error) {
        log.error(`Failed to stop scheduler '${name}':`, error)
      }
    })

    await Promise.allSettled(stopPromises)
    log.info('All schedulers stopped')
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      return
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkHealth()
    }, this.config.healthCheckInterval)

    log.info(`Health checks started (interval: ${this.config.healthCheckInterval}ms)`)
  }

  /**
   * Check health of all schedulers
   */
  async checkHealth(): Promise<void> {
    for (const [name, entry] of this.schedulers) {
      const health = entry.scheduler.getHealthStatus()

      if (!health.healthy) {
        log.warn(`Scheduler '${name}' is unhealthy:`, health.issues)

        // Attempt restart if under limit
        if (entry.restartAttempts < this.config.maxRestartAttempts) {
          await this.restartScheduler(name)
        } else {
          log.error(`Scheduler '${name}' exceeded max restart attempts`)
        }
      }
    }
  }

  /**
   * Restart a specific scheduler
   */
  async restartScheduler(name: string): Promise<boolean> {
    const entry = this.schedulers.get(name)
    if (!entry) {
      log.error(`Scheduler '${name}' not found`)
      return false
    }

    // Check restart cooldown
    if (entry.lastRestart) {
      const timeSinceLastRestart = Date.now() - entry.lastRestart.getTime()
      if (timeSinceLastRestart < this.config.restartDelay) {
        log.warn(`Scheduler '${name}' recently restarted, skipping`)
        return false
      }
    }

    log.info(`Restarting scheduler: ${name}`)

    try {
      await entry.scheduler.stop()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
      await entry.scheduler.start()

      entry.restartAttempts++
      entry.lastRestart = new Date()

      log.info(`Scheduler '${name}' restarted successfully`)
      return true
    } catch (error) {
      log.error(`Failed to restart scheduler '${name}':`, error)
      return false
    }
  }

  /**
   * Get metrics for all schedulers
   */
  getAllMetrics(): SchedulerMetrics[] {
    return Array.from(this.schedulers.values()).map(entry => entry.scheduler.getMetrics())
  }

  /**
   * Get health status for all schedulers
   */
  getAllHealthStatus(): Array<{
    name: string
    healthy: boolean
    metrics: SchedulerMetrics
    issues: string[]
  }> {
    return Array.from(this.schedulers.entries()).map(([name, entry]) => ({
      name,
      ...entry.scheduler.getHealthStatus(),
    }))
  }

  /**
   * Get scheduler by name
   */
  getScheduler(name: string): BaseScheduler | undefined {
    return this.schedulers.get(name)?.scheduler
  }

  /**
   * List all registered schedulers
   */
  listSchedulers(): string[] {
    return Array.from(this.schedulers.keys())
  }
}

// Singleton instance
let managerInstance: SchedulerManager | null = null

/**
 * Get or create scheduler manager instance
 */
export function getSchedulerManager(config?: Partial<SchedulerManagerConfig>): SchedulerManager {
  if (!managerInstance) {
    managerInstance = new SchedulerManager(config)
  }
  return managerInstance
}

/**
 * Create and configure default schedulers
 */
export function createDefaultSchedulers(): SchedulerManager {
  const manager = getSchedulerManager()

  // Register RSS scheduler
  const rssScheduler = new RSSScheduler({
    name: 'rss',
    enabled: process.env.DISABLE_SCHEDULERS !== '1',
    fetchInterval: '0 */3 * * *', // Every 3 hours
    initialDelay: 2000,
    lockTimeout: 600,
  })

  manager.register('rss', rssScheduler)

  const aiItScheduler = new AIITScheduler({
    name: 'ai-it',
    enabled: process.env.DISABLE_SCHEDULERS !== '1',
    highPriorityInterval: '*/15 * * * *',
    midPriorityInterval: '*/30 * * * *',
    lowPriorityInterval: '*/60 * * * *',
    initialDelay: 5000,
    lockTimeout: 300,
  })
  manager.register('ai-it', aiItScheduler)

  const financialScheduler = new FinancialScheduler({
    name: 'financial',
    enabled: process.env.DISABLE_SCHEDULERS !== '1',
    initialDelay: 5000,
    lockTimeout: 600,
  })
  manager.register('financial', financialScheduler)

  return manager
}
