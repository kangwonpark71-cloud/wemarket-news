/**
 * Base Scheduler Interface
 * Provides common interface and utilities for all schedulers
 */

export interface SchedulerJob {
  name: string
  schedule: string // cron expression or interval
  handler: () => Promise<void>
  retryCount?: number
  retryDelay?: number
  timeout?: number
}

export interface SchedulerMetrics {
  schedulerName: string
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  lastSuccess?: Date
  lastFailure?: Date
  averageDuration?: number
  lastDuration?: number
}

export interface SchedulerConfig {
  name: string
  enabled: boolean
  metricsEnabled: boolean
  maxConcurrentJobs: number
}

export abstract class BaseScheduler {
  protected config: SchedulerConfig
  protected metrics: SchedulerMetrics
  protected isRunning = false
  protected currentJobs = 0

  constructor(config: SchedulerConfig) {
    this.config = config
    this.metrics = {
      schedulerName: config.name,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
    }
  }

  /**
   * Start the scheduler
   */
  abstract start(): Promise<void>

  /**
   * Stop the scheduler
   */
  abstract stop(): Promise<void>

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      schedulerName: this.config.name,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
    }
  }

  /**
   * Record job success
   */
  protected recordSuccess(duration: number): void {
    this.metrics.totalJobs++
    this.metrics.successfulJobs++
    this.metrics.lastSuccess = new Date()
    this.metrics.lastDuration = duration

    // Update average duration
    if (this.metrics.averageDuration) {
      this.metrics.averageDuration = (this.metrics.averageDuration + duration) / 2
    } else {
      this.metrics.averageDuration = duration
    }
  }

  /**
   * Record job failure
   */
  protected recordFailure(duration: number): void {
    this.metrics.totalJobs++
    this.metrics.failedJobs++
    this.metrics.lastFailure = new Date()
    this.metrics.lastDuration = duration
  }

  /**
   * Execute a job with error handling and metrics
   */
  protected async executeJob<T>(
    jobName: string,
    jobFn: () => Promise<T>,
    options?: {
      retryCount?: number
      retryDelay?: number
      timeout?: number
    }
  ): Promise<T | null> {
    if (this.currentJobs >= this.config.maxConcurrentJobs) {
      console.warn(`[${this.config.name}] Max concurrent jobs reached, skipping ${jobName}`)
      return null
    }

    this.currentJobs++
    const startTime = Date.now()
    let lastError: Error | null = null

    try {
      for (let attempt = 0; attempt <= (options?.retryCount || 0); attempt++) {
        try {
          // Add timeout if specified
          const result = options?.timeout
            ? await Promise.race([
                jobFn(),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error(`Job ${jobName} timed out after ${options.timeout}ms`)), options.timeout)
                ),
              ])
            : await jobFn()

          const duration = Date.now() - startTime
          this.recordSuccess(duration)

          if (this.config.metricsEnabled) {
            console.log(`[${this.config.name}] ${jobName} completed in ${duration}ms`)
          }

          return result
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          if (attempt < (options?.retryCount || 0)) {
            console.warn(
              `[${this.config.name}] ${jobName} attempt ${attempt + 1} failed, retrying in ${options?.retryDelay || 1000}ms...`
            )
            await new Promise(resolve => setTimeout(resolve, options?.retryDelay || 1000))
          }
        }
      }

      // All attempts failed
      const duration = Date.now() - startTime
      this.recordFailure(duration)

      if (lastError) {
        console.error(`[${this.config.name}] ${jobName} failed after ${(options?.retryCount || 0) + 1} attempts:`, lastError.message)
      }

      return null
    } finally {
      this.currentJobs--
    }
  }

  /**
   * Check if scheduler is healthy
   */
  isHealthy(): boolean {
    if (!this.config.enabled) {
      return true // Disabled schedulers are considered healthy
    }

    // Check if too many failures
    if (this.metrics.failedJobs > 10 && this.metrics.failedJobs > this.metrics.successfulJobs) {
      return false
    }

    // Check if last failure was recent
    if (this.metrics.lastFailure) {
      const timeSinceLastFailure = Date.now() - this.metrics.lastFailure.getTime()
      if (timeSinceLastFailure < 60000 && this.metrics.failedJobs > 5) {
        return false
      }
    }

    return true
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean
    scheduler: string
    metrics: SchedulerMetrics
    issues: string[]
  } {
    const issues: string[] = []

    if (!this.config.enabled) {
      issues.push('Scheduler is disabled')
    }

    if (this.metrics.failedJobs > 10 && this.metrics.failedJobs > this.metrics.successfulJobs) {
      issues.push(`High failure rate: ${this.metrics.failedJobs}/${this.metrics.totalJobs}`)
    }

    if (this.metrics.lastFailure) {
      const timeSinceLastFailure = Date.now() - this.metrics.lastFailure.getTime()
      if (timeSinceLastFailure < 60000 && this.metrics.failedJobs > 5) {
        issues.push('Recent failures detected')
      }
    }

    if (this.currentJobs > 0) {
      issues.push(`${this.currentJobs} jobs currently running`)
    }

    return {
      healthy: this.isHealthy(),
      scheduler: this.config.name,
      metrics: this.getMetrics(),
      issues,
    }
  }
}
