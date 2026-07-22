/**
 * Financial Scheduler Implementation
 * Handles financial data fetching (stocks, crypto, forex, global indices)
 */

import cron, { type ScheduledTask } from 'node-cron'
import { BaseScheduler, type SchedulerConfig } from './base-scheduler'
import { koreaInvestmentService } from '@/lib/services/financial/financial-service'
import { upbitService } from '@/lib/services/crypto/crypto-service'
import { marketService } from '@/lib/services/market/market-service'
import { runJobWithLock } from '@/lib/utils/lock'

export interface FinancialSchedulerConfig extends SchedulerConfig {
  stockPriceInterval: number      // ms: default 5 min
  cryptoTickerInterval: number    // ms: default 1 min
  forexInterval: number           // ms: default 30 min
  globalIndexInterval: number     // ms: default 30 min
  stockMasterSyncCron: string     // cron: default '0 0 * * *' (daily)
  cryptoMarketSyncCron: string    // cron: default '0 0 * * *' (daily)
  initialDelay: number            // ms
  lockTimeout: number             // seconds
}

const defaultConfig: FinancialSchedulerConfig = {
  name: 'financial',
  enabled: true,
  metricsEnabled: true,
  maxConcurrentJobs: 1,
  stockPriceInterval: 5 * 60 * 1000,
  cryptoTickerInterval: 60 * 1000,
  forexInterval: 30 * 60 * 1000,
  globalIndexInterval: 30 * 60 * 1000,
  stockMasterSyncCron: '0 0 * * *',
  cryptoMarketSyncCron: '0 0 * * *',
  initialDelay: 5000,
  lockTimeout: 600,
}

export class FinancialScheduler extends BaseScheduler {
  private cronTasks: ScheduledTask[] = []
  private intervalIds: NodeJS.Timeout[] = []

  constructor(config: Partial<FinancialSchedulerConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config }
    super(fullConfig)
  }

  private get finConfig(): FinancialSchedulerConfig {
    return this.config as FinancialSchedulerConfig
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log(`[${this.config.name}] Scheduler is disabled`)
      return
    }

    if (this.cronTasks.length > 0 || this.intervalIds.length > 0) {
      console.warn(`[${this.config.name}] Scheduler already started`)
      return
    }

    console.log(`[${this.config.name}] Starting scheduler...`)

    // Periodic interval-based tasks
    this.addInterval('stock-price', this.finConfig.stockPriceInterval, () => this.updateStockPrices())
    this.addInterval('crypto-ticker', this.finConfig.cryptoTickerInterval, () => this.updateCryptoTickers())
    this.addInterval('forex', this.finConfig.forexInterval, () => this.updateForexRates())
    this.addInterval('global-index', this.finConfig.globalIndexInterval, () => this.updateGlobalIndices())

    // Daily cron tasks
    this.cronTasks.push(
      cron.schedule(this.finConfig.stockMasterSyncCron, async () => {
        await this.runWithLock('financial:stock-master', () => this.syncStockMaster())
      })
    )
    this.cronTasks.push(
      cron.schedule(this.finConfig.cryptoMarketSyncCron, async () => {
        await this.runWithLock('financial:crypto-market', () => this.syncCryptoMarkets())
      })
    )

    // Initial sync after delay
    setTimeout(async () => {
      await runJobWithLock('financial:initial', async () => {
        await this.syncStockMaster().catch(() => {})
        await this.syncCryptoMarkets().catch(() => {})
        await this.updateStockPrices().catch(() => {})
        await this.updateCryptoTickers().catch(() => {})
        await this.updateForexRates().catch(() => {})
        await this.updateGlobalIndices().catch(() => {})
      }).catch(err => console.error(`[${this.config.name}] Initial sync error:`, err))
    }, this.finConfig.initialDelay)

    console.log(`[${this.config.name}] Scheduler started`)
  }

  async stop(): Promise<void> {
    for (const task of this.cronTasks) {
      task.stop()
    }
    this.cronTasks = []

    for (const id of this.intervalIds) {
      clearInterval(id)
    }
    this.intervalIds = []

    console.log(`[${this.config.name}] Scheduler stopped`)
  }

  private addInterval(name: string, intervalMs: number, jobFn: () => Promise<void>): void {
    const id = setInterval(async () => {
      await this.runWithLock(`financial:${name}`, jobFn)
    }, intervalMs)
    this.intervalIds.push(id)
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
        retryDelay: 5000,
        timeout: 120000,
      }
    )
  }

  private async acquireLock(name: string): Promise<boolean> {
    try {
      const { cacheService } = await import('@/lib/services/cache/cache-service')
      return await cacheService.acquireLock(name, this.finConfig.lockTimeout)
    } catch {
      return true
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

  // --- Financial data jobs ---

  private async updateStockPrices(): Promise<void> {
    try {
      await koreaInvestmentService.syncStockMasterToDb()
      const stocks = await koreaInvestmentService.getStockMaster()
      const codes = stocks.map(s => s.code)
      const prices = await koreaInvestmentService.getStockPrices(codes)
      const pricesArray = Array.from(prices.values())
      await koreaInvestmentService.saveStockPricesToDb(pricesArray)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to update stock prices:`, error)
      throw error
    }
  }

  private async updateCryptoTickers(): Promise<void> {
    try {
      const tickers = await upbitService.getAllTickers()
      await upbitService.saveTickersToDb(tickers)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to update crypto tickers:`, error)
      throw error
    }
  }

  private async updateForexRates(): Promise<void> {
    try {
      const rates = await marketService.getAllExchangeRates()
      await marketService.saveExchangeRatesToDb(rates)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to update forex rates:`, error)
      throw error
    }
  }

  private async updateGlobalIndices(): Promise<void> {
    try {
      const indices = await marketService.getGlobalIndices()
      await marketService.saveGlobalIndicesToDb(indices)
    } catch (error) {
      console.error(`[${this.config.name}] Failed to update global indices:`, error)
      throw error
    }
  }

  private async syncStockMaster(): Promise<void> {
    try {
      await koreaInvestmentService.syncStockMasterToDb()
    } catch (error) {
      console.error(`[${this.config.name}] Failed to sync stock master:`, error)
      throw error
    }
  }

  private async syncCryptoMarkets(): Promise<void> {
    try {
      await upbitService.syncMarketsToDb()
    } catch (error) {
      console.error(`[${this.config.name}] Failed to sync crypto markets:`, error)
      throw error
    }
  }
}
