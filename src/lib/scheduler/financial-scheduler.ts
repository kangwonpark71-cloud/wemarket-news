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
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger';

const log = createLogger('FinancialScheduler')

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
      log.info('Scheduler is disabled')
      return
    }

    if (this.cronTasks.length > 0 || this.intervalIds.length > 0) {
      log.warn('Scheduler already started')
      return
    }

    log.info('Starting scheduler...')

    // Periodic interval-based tasks
    this.addInterval('stock-price', this.finConfig.stockPriceInterval, () => this.updateStockPrices())
    this.addInterval('crypto-ticker', this.finConfig.cryptoTickerInterval, () => this.updateCryptoTickers())
    this.addInterval('forex', this.finConfig.forexInterval, () => this.updateForexRates())
    this.addInterval('global-index', this.finConfig.globalIndexInterval, () => this.updateGlobalIndices())
    this.addInterval('daily-stats', 60 * 60 * 1000, () => this.calculateDailyStats())
    this.addInterval('cleanup-old-data', 24 * 60 * 60 * 1000, () => this.cleanupOldData())

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
      }).catch(err => log.error('Initial sync error:', err))
    }, this.finConfig.initialDelay)

    log.info('Scheduler started')
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

    log.info('Scheduler stopped')
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
        const acquired = await runJobWithLock(name, jobFn, this.finConfig.lockTimeout)
        if (!acquired) {
          log.info(`Could not acquire lock for ${name}, skipping`)
        }
      },
      {
        retryCount: 1,
        retryDelay: 5000,
        timeout: 120000,
      }
    )
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
      log.error('Failed to update stock prices:', error)
      throw error
    }
  }

  private async updateCryptoTickers(): Promise<void> {
    try {
      const tickers = await upbitService.getAllTickers()
      await upbitService.saveTickersToDb(tickers)
    } catch (error) {
      log.error('Failed to update crypto tickers:', error)
      throw error
    }
  }

  private async updateForexRates(): Promise<void> {
    try {
      const rates = await marketService.getAllExchangeRates()
      await marketService.saveExchangeRatesToDb(rates)
    } catch (error) {
      log.error('Failed to update forex rates:', error)
      throw error
    }
  }

  private async updateGlobalIndices(): Promise<void> {
    try {
      const indices = await marketService.getGlobalIndices()
      await marketService.saveGlobalIndicesToDb(indices)
    } catch (error) {
      log.error('Failed to update global indices:', error)
      throw error
    }
  }

  private async syncStockMaster(): Promise<void> {
    try {
      await koreaInvestmentService.syncStockMasterToDb()
    } catch (error) {
      log.error('Failed to sync stock master:', error)
      throw error
    }
  }

  private async syncCryptoMarkets(): Promise<void> {
    try {
      await upbitService.syncMarketsToDb()
    } catch (error) {
      log.error('Failed to sync crypto markets:', error)
      throw error
    }
  }

  private async calculateDailyStats(): Promise<void> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      const stockPrices = await prisma.stockPrice.findMany({
        where: {
          timestamp: { gte: today },
        },
        include: {
          stock: {
            select: { code: true, market: true },
          },
        },
      })

      if (stockPrices.length > 0) {
        const markets = ['KOSPI', 'KOSDAQ']
        for (const market of markets) {
          const marketStocks = stockPrices.filter(p =>
            market === 'KOSPI' ? p.stock.code.startsWith('001') : p.stock.code.startsWith('101')
          )

          if (marketStocks.length === 0) continue

          const totalStocks = marketStocks.length
          const advancing = marketStocks.filter(s => Number(s.change) > 0).length
          const declining = marketStocks.filter(s => Number(s.change) < 0).length
          const unchanged = totalStocks - advancing - declining
          const upperLimit = marketStocks.filter(s => Number(s.changeRate) >= 30).length
          const lowerLimit = marketStocks.filter(s => Number(s.changeRate) <= -30).length
          const totalVolume = marketStocks.reduce((sum, s) => sum + Number(s.volume), 0)
          const totalValue = marketStocks.reduce((sum, s) => sum + Number(s.tradingValue), 0)

          await prisma.stockDailyStat.upsert({
            where: { date: today, market },
            update: {
              totalStocks,
              advancing,
              declining,
              unchanged,
              upperLimit,
              lowerLimit,
              totalVolume,
              totalValue,
            },
            create: {
              date: today,
              market,
              totalStocks,
              advancing,
              declining,
              unchanged,
              upperLimit,
              lowerLimit,
              totalVolume,
              totalValue,
            },
          })
        }
      }

      const cryptoTickers = await prisma.cryptoTicker.findMany({
        where: { timestamp: { gte: today } },
      })

      if (cryptoTickers.length > 0) {
        const totalMarketCap = cryptoTickers.reduce((sum, t) => sum + Number(t.tradePrice), 0)
        const totalVolume24h = cryptoTickers.reduce((sum, t) => sum + Number(t.accTradePrice24h), 0)

        await prisma.cryptoDailyStat.upsert({
          where: { date: today },
          update: { totalMarketCap, totalVolume24h },
          create: { date: today, totalMarketCap, totalVolume24h },
        })
      }

      const forexRates = await prisma.exchangeRate.findMany({
        where: { timestamp: { gte: today } },
      })

      if (forexRates.length > 0) {
        const usd = forexRates.find(r => r.baseCurrency === 'USD')
        const jpy = forexRates.find(r => r.baseCurrency === 'JPY')
        const eur = forexRates.find(r => r.baseCurrency === 'EUR')
        const cny = forexRates.find(r => r.baseCurrency === 'CNY')

        await prisma.exchangeRateDailyStat.upsert({
          where: { date: today },
          update: {
            usdRate: usd?.rate || 0,
            usdChange: usd?.change || 0,
            usdChangeRate: usd?.changeRate || 0,
            jpyRate: jpy?.rate || 0,
            jpyChange: jpy?.change || 0,
            jpyChangeRate: jpy?.changeRate || 0,
            eurRate: eur?.rate || 0,
            eurChange: eur?.change || 0,
            eurChangeRate: eur?.changeRate || 0,
            cnyRate: cny?.rate || 0,
            cnyChange: cny?.change || 0,
            cnyChangeRate: cny?.changeRate || 0,
          },
          create: {
            date: today,
            usdRate: usd?.rate || 0,
            usdChange: usd?.change || 0,
            usdChangeRate: usd?.changeRate || 0,
            jpyRate: jpy?.rate || 0,
            jpyChange: jpy?.change || 0,
            jpyChangeRate: jpy?.changeRate || 0,
            eurRate: eur?.rate || 0,
            eurChange: eur?.change || 0,
            eurChangeRate: eur?.changeRate || 0,
            cnyRate: cny?.rate || 0,
            cnyChange: cny?.change || 0,
            cnyChangeRate: cny?.changeRate || 0,
          },
        })
      }
    } catch (error) {
      log.error('Failed to calculate daily stats:', error)
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      await prisma.stockPrice.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } },
      })

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      await prisma.cryptoTicker.deleteMany({
        where: { timestamp: { lt: sevenDaysAgo } },
      })

      await prisma.financialFetchLog.deleteMany({
        where: { fetchedAt: { lt: thirtyDaysAgo } },
      })

      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      await prisma.cryptoCandle.deleteMany({
        where: {
          AND: [
            { unit: { in: ['days', 'weeks', 'months'] } },
            { timestamp: { lt: ninetyDaysAgo } },
          ],
        },
      })
    } catch (error) {
      log.error('Failed to cleanup old data:', error)
    }
  }

}
