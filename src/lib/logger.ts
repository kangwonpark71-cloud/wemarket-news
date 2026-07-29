/**
 * Structured Logger
 * Lightweight, zero-dependency logger with levels, timestamps, and prefix tags.
 * Replaces raw console.log/warn/error for consistent, filterable output.
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('SchedulerManager')
 *   log.info('Starting schedulers...')
 *   log.error('Failed to start', error)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase()
  if (env in LEVEL_PRIORITY) return env as LogLevel
  return 'info'
}

function timestamp(): string {
  return new Date().toISOString()
}

function formatMessage(level: LogLevel, tag: string, message: string): string {
  const ts = timestamp()
  const prefix = tag ? `[${tag}]` : ''
  return `${ts} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}`
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

export function createLogger(tag: string): Logger {
  const minPriority = LEVEL_PRIORITY[getMinLevel()]

  return {
    debug(message: string, ...args: unknown[]) {
      if (minPriority <= LEVEL_PRIORITY.debug) {
        console.debug(formatMessage('debug', tag, message), ...args)
      }
    },
    info(message: string, ...args: unknown[]) {
      if (minPriority <= LEVEL_PRIORITY.info) {
        console.log(formatMessage('info', tag, message), ...args)
      }
    },
    warn(message: string, ...args: unknown[]) {
      if (minPriority <= LEVEL_PRIORITY.warn) {
        console.warn(formatMessage('warn', tag, message), ...args)
      }
    },
    error(message: string, ...args: unknown[]) {
      if (minPriority <= LEVEL_PRIORITY.error) {
        console.error(formatMessage('error', tag, message), ...args)
      }
    },
  }
}

/**
 * Default logger without a tag — use for top-level or miscellaneous logging.
 */
export const logger = createLogger('')
