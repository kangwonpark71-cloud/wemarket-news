/**
import { createLogger } from '@/lib/logger'
const log = createLogger('SchedulerErrorHandler')

 * Scheduler error handling utilities
 * Provides consistent error handling and logging for all schedulers
 */

export interface SchedulerError {
  timestamp: Date
  scheduler: string
  job: string
  error: Error
  context?: Record<string, unknown>
  retryCount?: number
}

export interface SchedulerMetrics {
  scheduler: string
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  lastSuccess?: Date
  lastFailure?: Date
  averageDuration?: number
}

// In-memory metrics storage (in production, use Redis or DB)
const schedulerMetrics = new Map<string, SchedulerMetrics>()

/**
 * Log scheduler error with context
 */
export function logSchedulerError(
  scheduler: string,
  job: string,
  error: Error,
  context?: Record<string, unknown>
): SchedulerError {
  const schedulerError: SchedulerError = {
    timestamp: new Date(),
    scheduler,
    job,
    error,
    context,
  }

  // Update metrics
  const metrics = schedulerMetrics.get(scheduler) || {
    scheduler,
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
  }
  metrics.failedJobs++
  metrics.lastFailure = new Date()
  schedulerMetrics.set(scheduler, metrics)

  // Log to console with structured format
  log.error(`[Scheduler Error] ${scheduler}/${job}:`, {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: schedulerError.timestamp.toISOString(),
  })

  return schedulerError
}

/**
 * Log scheduler success with metrics
 */
export function logSchedulerSuccess(
  scheduler: string,
  job: string,
  duration: number,
  context?: Record<string, unknown>
): void {
  const metrics = schedulerMetrics.get(scheduler) || {
    scheduler,
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
  }

  metrics.totalJobs++
  metrics.successfulJobs++
  metrics.lastSuccess = new Date()
  
  // Update average duration
  if (metrics.averageDuration) {
    metrics.averageDuration = (metrics.averageDuration + duration) / 2
  } else {
    metrics.averageDuration = duration
  }

  schedulerMetrics.set(scheduler, metrics)

  // Log success for debugging (can be disabled in production)
  if (process.env.NODE_ENV === 'development') {
    log.log(`[Scheduler Success] ${scheduler}/${job}:`, {
      duration: `${duration}ms`,
      context,
    })
  }
}

/**
 * Get metrics for a specific scheduler
 */
export function getSchedulerMetrics(scheduler: string): SchedulerMetrics | undefined {
  return schedulerMetrics.get(scheduler)
}

/**
 * Get all scheduler metrics
 */
export function getAllSchedulerMetrics(): SchedulerMetrics[] {
  return Array.from(schedulerMetrics.values())
}

/**
 * Create a wrapped scheduler job with error handling
 */
export function createSafeSchedulerJob<T>(
  schedulerName: string,
  jobName: string,
  jobFn: () => Promise<T>,
  options?: {
    onError?: (error: Error) => void
    onSuccess?: (result: T) => void
    retryCount?: number
    retryDelay?: number
  }
): () => Promise<T | null> {
  return async () => {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= (options?.retryCount || 0); attempt++) {
      try {
        const result = await jobFn()
        const duration = Date.now() - startTime

        logSchedulerSuccess(schedulerName, jobName, duration, {
          attempt: attempt + 1,
          result: typeof result === 'object' ? 'object' : result,
        })

        options?.onSuccess?.(result)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < (options?.retryCount || 0)) {
          log.warn(
            `[Scheduler] ${schedulerName}/${jobName} attempt ${attempt + 1} failed, retrying in ${options?.retryDelay || 1000}ms...`
          )
          await new Promise(resolve => setTimeout(resolve, options?.retryDelay || 1000))
        }
      }
    }

    // All attempts failed
    if (lastError) {
      logSchedulerError(schedulerName, jobName, lastError, {
        attempts: (options?.retryCount || 0) + 1,
      })
      options?.onError?.(lastError)
    }

    return null
  }
}

/**
 * Wrap a scheduler job with try-catch and metrics
 */
export async function withSchedulerErrorHandling<T>(
  schedulerName: string,
  jobName: string,
  jobFn: () => Promise<T>,
  options?: {
    onError?: (error: Error) => void
    fallback?: T
  }
): Promise<T | undefined> {
  const startTime = Date.now()

  try {
    const result = await jobFn()
    const duration = Date.now() - startTime
    logSchedulerSuccess(schedulerName, jobName, duration)
    return result
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logSchedulerError(schedulerName, jobName, err)
    options?.onError?.(err)
    return options?.fallback
  }
}
