import { koreaInvestmentService } from '@/lib/services/financial/financial-service';
import { upbitService } from '@/lib/services/crypto/crypto-service';
import { marketService } from '@/lib/services/market/market-service';
import { runJobWithLock } from '@/lib/utils/lock';
import { prisma } from '@/lib/db';

interface SchedulerConfig {
  stockPriceInterval: number;
  cryptoTickerInterval: number;
  forexInterval: number;
  globalIndexInterval: number;
  stockMasterSyncInterval: number;
  cryptoMarketSyncInterval: number;
}

interface ScheduledTask {
  name: string;
  intervalMs: number;
  job: () => Promise<void>;
  lastRun?: number;
  nextRun?: number;
  isRunning: boolean;
  timeoutId?: NodeJS.Timeout;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  private defaultConfig: SchedulerConfig = {
    stockPriceInterval: 5 * 60 * 1000,
    cryptoTickerInterval: 60 * 1000,
    forexInterval: 30 * 60 * 1000,
    globalIndexInterval: 30 * 60 * 1000,
    stockMasterSyncInterval: 24 * 60 * 60 * 1000,
    cryptoMarketSyncInterval: 24 * 60 * 60 * 1000,
  };

  constructor(config: Partial<SchedulerConfig> = {}) {
    const finalConfig = { ...this.defaultConfig, ...config };
    this.registerDefaultTasks(finalConfig);
  }

  private registerDefaultTasks(config: SchedulerConfig) {
    this.addTask({
      name: 'stock-price-update',
      intervalMs: config.stockPriceInterval,
      job: this.updateStockPrices.bind(this),
    });

    this.addTask({
      name: 'crypto-ticker-update',
      intervalMs: config.cryptoTickerInterval,
      job: this.updateCryptoTickers.bind(this),
    });

    this.addTask({
      name: 'forex-update',
      intervalMs: config.forexInterval,
      job: this.updateForexRates.bind(this),
    });

    this.addTask({
      name: 'global-index-update',
      intervalMs: config.globalIndexInterval,
      job: this.updateGlobalIndices.bind(this),
    });

    this.addTask({
      name: 'stock-master-sync',
      intervalMs: config.stockMasterSyncInterval,
      job: this.syncStockMaster.bind(this),
    });

    this.addTask({
      name: 'crypto-market-sync',
      intervalMs: config.cryptoMarketSyncInterval,
      job: this.syncCryptoMarkets.bind(this),
    });

    this.addTask({
      name: 'daily-stats-calculation',
      intervalMs: 60 * 60 * 1000,
      job: this.calculateDailyStats.bind(this),
    });

    this.addTask({
      name: 'cleanup-old-data',
      intervalMs: 24 * 60 * 60 * 1000,
      job: this.cleanupOldData.bind(this),
    });
  }

  addTask(task: {
    name: string;
    intervalMs: number;
    job: () => Promise<void>;
  }): void {
    this.tasks.set(task.name, {
      ...task,
      isRunning: false,
    });
  }

  removeTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (task?.timeoutId) {
      clearTimeout(task.timeoutId);
    }
    return this.tasks.delete(name);
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    for (const [name] of this.tasks) {
      this.scheduleTask(name);
    }


    setTimeout(() => {
      void runJobWithLock('financial:initial', async () => {
        await this.syncStockMaster().catch(() => {});
        await this.syncCryptoMarkets().catch(() => {});
        await this.updateStockPrices().catch(() => {});
        await this.updateCryptoTickers().catch(() => {});
        await this.updateForexRates().catch(() => {});
        await this.updateGlobalIndices().catch(() => {});
      }, 600).catch((err) => console.error('[Scheduler] Failed to run initial sync:', err));
    }, 5000);
  }

  stop(): void {
    this.isRunning = false;
    for (const [name] of this.tasks) {
      const task = this.tasks.get(name);
      if (!task) continue;
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
        task.timeoutId = undefined;
      }
      task.isRunning = false;
    }
  }

  private scheduleTask(name: string): void {
    const task = this.tasks.get(name);
    if (!task || !this.isRunning) return;

    const runTask = async () => {
      if (task.isRunning || !this.isRunning) {
        this.scheduleNext(name);
        return;
      }

      task.isRunning = true;
      task.lastRun = Date.now();

      try {
        await task.job();
      } catch (error) {
        console.error(`[Scheduler] Task ${name} failed:`, error);
        await this.logFetchError(name, error);
      } finally {
        task.isRunning = false;
        this.scheduleNext(name);
      }
    };

    task.timeoutId = setTimeout(runTask, task.intervalMs);
    task.nextRun = Date.now() + task.intervalMs;
  }

  private scheduleNext(name: string): void {
    const task = this.tasks.get(name);
    if (!task || !this.isRunning) return;

    task.timeoutId = setTimeout(() => {
      const task = this.tasks.get(name);
      if (task && !task.isRunning && this.isRunning) {
        task.job().catch(console.error);
      }
      if (this.isRunning) this.scheduleNext(name);
    }, task.intervalMs);
  }

  async updateStockPrices(): Promise<void> {
    try {
      await koreaInvestmentService.syncStockMasterToDb();
      const stocks = await koreaInvestmentService.getStockMaster();
      
      const codes = stocks.map(s => s.code);
      
      const prices = await koreaInvestmentService.getStockPrices(codes);
      
      const pricesArray = Array.from(prices.values());
      await koreaInvestmentService.saveStockPricesToDb(pricesArray);

    } catch (error) {
      console.error('[Scheduler] Failed to update stock prices:', error);
      throw error;
    }
  }

  async updateCryptoTickers(): Promise<void> {
    try {
      const tickers = await upbitService.getAllTickers();
      await upbitService.saveTickersToDb(tickers);

    } catch (error) {
      console.error('[Scheduler] Failed to update crypto tickers:', error);
      throw error;
    }
  }

  async updateForexRates(): Promise<void> {
    try {
      const rates = await marketService.getAllExchangeRates();
      await marketService.saveExchangeRatesToDb(rates);

    } catch (error) {
      console.error('[Scheduler] Failed to update forex rates:', error);
      throw error;
    }
  }

  async updateGlobalIndices(): Promise<void> {
    try {
      const indices = await marketService.getGlobalIndices();
      await marketService.saveGlobalIndicesToDb(indices);

    } catch (error) {
      console.error('[Scheduler] Failed to update global indices:', error);
      throw error;
    }
  }

  async syncStockMaster(): Promise<void> {
    try {
      await koreaInvestmentService.syncStockMasterToDb();
    } catch (error) {
      console.error('[Scheduler] Failed to sync stock master:', error);
      throw error;
    }
  }

  async syncCryptoMarkets(): Promise<void> {
    try {
      await upbitService.syncMarketsToDb();
    } catch (error) {
      console.error('[Scheduler] Failed to sync crypto markets:', error);
      throw error;
    }
  }

  async calculateDailyStats(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Stock daily stats
      const stockPrices = await prisma.stockPrice.findMany({
        where: {
          timestamp: { gte: today },
        },
        include: {
          stock: {
            select: { code: true, market: true },
          },
        },
      });

      if (stockPrices.length > 0) {
        const markets = ['KOSPI', 'KOSDAQ'];
        for (const market of markets) {
          const marketStocks = stockPrices.filter(p => 
            market === 'KOSPI' ? p.stock.code.startsWith('001') : p.stock.code.startsWith('101')
          );
          
          if (marketStocks.length === 0) continue;

          const totalStocks = marketStocks.length;
          const advancing = marketStocks.filter(s => Number(s.change) > 0).length;
          const declining = marketStocks.filter(s => Number(s.change) < 0).length;
          const unchanged = totalStocks - advancing - declining;
          const upperLimit = marketStocks.filter(s => Number(s.changeRate) >= 30).length;
          const lowerLimit = marketStocks.filter(s => Number(s.changeRate) <= -30).length;
          const totalVolume = marketStocks.reduce((sum, s) => sum + Number(s.volume), 0);
          const totalValue = marketStocks.reduce((sum, s) => sum + Number(s.tradingValue), 0);

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
          });
        }
      }

      // Crypto daily stats
      const cryptoTickers = await prisma.cryptoTicker.findMany({
        where: { timestamp: { gte: today } },
      });

      if (cryptoTickers.length > 0) {
        const totalMarketCap = cryptoTickers.reduce((sum, t) => sum + Number(t.tradePrice), 0);
        const totalVolume24h = cryptoTickers.reduce((sum, t) => sum + Number(t.accTradePrice24h), 0);

        await prisma.cryptoDailyStat.upsert({
          where: { date: today },
          update: { totalMarketCap, totalVolume24h },
          create: { date: today, totalMarketCap, totalVolume24h },
        });
      }

      // Forex daily stats
      const forexRates = await prisma.exchangeRate.findMany({
        where: { timestamp: { gte: today } },
      });

      if (forexRates.length > 0) {
        const usd = forexRates.find(r => r.baseCurrency === 'USD');
        const jpy = forexRates.find(r => r.baseCurrency === 'JPY');
        const eur = forexRates.find(r => r.baseCurrency === 'EUR');
        const cny = forexRates.find(r => r.baseCurrency === 'CNY');

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
        });
      }

    } catch (error) {
      console.error('[Scheduler] Failed to calculate daily stats:', error);
    }
  }

  async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean up old stock prices (keep 30 days)
      await prisma.stockPrice.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } },
      });

      // Clean up old crypto tickers (keep 7 days for minute data)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      await prisma.cryptoTicker.deleteMany({
        where: { timestamp: { lt: sevenDaysAgo } },
      });

      // Clean up old fetch logs
      await prisma.financialFetchLog.deleteMany({
        where: { fetchedAt: { lt: thirtyDaysAgo } },
      });

      // Clean up old candles (keep 90 days for daily, 7 days for minute)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      await prisma.cryptoCandle.deleteMany({
        where: {
          AND: [
            { unit: { in: ['days', 'weeks', 'months'] } },
            { timestamp: { lt: ninetyDaysAgo } },
          ],
        },
      });

    } catch (error) {
      console.error('[Scheduler] Failed to cleanup old data:', error);
    }
  }

  async logFetchError(service: string, error: unknown): Promise<void> {
    await prisma.financialFetchLog.create({
      data: {
        service,
        endpoint: 'scheduler',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
        fetchedAt: new Date(),
      },
    });
  }

  getStatus(): { running: boolean; tasks: Array<{ name: string; interval: number; lastRun?: number; nextRun?: number; isRunning: boolean }> } {
    return {
      running: this.isRunning,
      tasks: Array.from(this.tasks.entries()).map(([name, task]) => ({
        name,
        interval: task.intervalMs,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        isRunning: task.isRunning,
      })),
    };
  }

  async runTaskNow(name: string): Promise<void> {
    const task = this.tasks.get(name);
    if (!task) throw new Error(`Task ${name} not found`);
    
    if (task.isRunning) {
      throw new Error(`Task ${name} is already running`);
    }

    task.isRunning = true;
    try {
      await task.job();
    } finally {
      task.isRunning = false;
    }
  }
}

export const schedulerService = new SchedulerService();
