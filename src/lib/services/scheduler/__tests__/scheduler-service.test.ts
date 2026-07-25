import { SchedulerService } from '../scheduler-service'

// ── Mock external dependencies ──────────────────────────────────
jest.mock('@/lib/services/financial/financial-service', () => ({
  koreaInvestmentService: {
    syncStockMasterToDb:   jest.fn().mockResolvedValue(undefined),
    getStockMaster:        jest.fn().mockResolvedValue([]),
    getStockPrices:        jest.fn().mockResolvedValue(new Map()),
    saveStockPricesToDb:   jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('@/lib/services/crypto/crypto-service', () => ({
  upbitService: {
    getAllTickers:    jest.fn().mockResolvedValue([]),
    saveTickersToDb:  jest.fn().mockResolvedValue(undefined),
    syncMarketsToDb:  jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('@/lib/services/market/market-service', () => ({
  marketService: {
    getAllExchangeRates:   jest.fn().mockResolvedValue([]),
    saveExchangeRatesToDb: jest.fn().mockResolvedValue(undefined),
    getGlobalIndices:      jest.fn().mockResolvedValue([]),
    saveGlobalIndicesToDb: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    stockPrice:           { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    cryptoTicker:         { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    exchangeRate:         { findMany: jest.fn().mockResolvedValue([]) },
    stockDailyStat:       { upsert: jest.fn().mockResolvedValue({}) },
    cryptoDailyStat:      { upsert: jest.fn().mockResolvedValue({}) },
    exchangeRateDailyStat:{ upsert: jest.fn().mockResolvedValue({}) },
    financialFetchLog:    { create: jest.fn().mockResolvedValue({}) },
    cryptoCandle:         { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  },
}))

describe('SchedulerService', () => {
  let scheduler: SchedulerService

  beforeEach(() => {
    jest.useFakeTimers()
    scheduler = new SchedulerService()
  })

  afterEach(() => {
    scheduler.stop()
    jest.useRealTimers()
  })

  // ── Default tasks ────────────────────────────────────────────
  it('should register default tasks on construction', () => {
    const status = scheduler.getStatus()
    expect(status.tasks.length).toBeGreaterThanOrEqual(7)
    const names = status.tasks.map(t => t.name)
    expect(names).toContain('stock-price-update')
    expect(names).toContain('crypto-ticker-update')
    expect(names).toContain('forex-update')
    expect(names).toContain('global-index-update')
    expect(names).toContain('daily-stats-calculation')
    expect(names).toContain('cleanup-old-data')
  })

  // ── start / stop ─────────────────────────────────────────────
  it('should report running=true after start()', () => {
    scheduler.start()
    expect(scheduler.getStatus().running).toBe(true)
  })

  it('should report running=false after stop()', () => {
    scheduler.start()
    scheduler.stop()
    expect(scheduler.getStatus().running).toBe(false)
  })

  it('should not double-start', () => {
    scheduler.start()
    scheduler.start() // second call should be no-op
    expect(scheduler.getStatus().running).toBe(true)
  })

  // ── add / remove task ────────────────────────────────────────
  it('should allow adding a custom task and include it in status', () => {
    scheduler.addTask({ name: 'my-custom-job', intervalMs: 10_000, job: jest.fn() })
    const names = scheduler.getStatus().tasks.map(t => t.name)
    expect(names).toContain('my-custom-job')
  })

  it('should allow removing a task', () => {
    scheduler.addTask({ name: 'temp-job', intervalMs: 5_000, job: jest.fn() })
    expect(scheduler.removeTask('temp-job')).toBe(true)
    const names = scheduler.getStatus().tasks.map(t => t.name)
    expect(names).not.toContain('temp-job')
  })

  it('should return false when removing a non-existent task', () => {
    expect(scheduler.removeTask('nope')).toBe(false)
  })

  // ── runTaskNow ───────────────────────────────────────────────
  it('should run a task immediately via runTaskNow()', async () => {
    const job = jest.fn().mockResolvedValue(undefined)
    scheduler.addTask({ name: 'immediate', intervalMs: 99_999, job })
    await scheduler.runTaskNow('immediate')
    expect(job).toHaveBeenCalledTimes(1)
  })

  it('should throw when runTaskNow is called for a non-existent task', async () => {
    await expect(scheduler.runTaskNow('ghost')).rejects.toThrow('not found')
  })

  // ── getStatus shape ──────────────────────────────────────────
  it('should return correct status shape', () => {
    const status = scheduler.getStatus()
    expect(status).toHaveProperty('running')
    expect(status).toHaveProperty('tasks')
    expect(Array.isArray(status.tasks)).toBe(true)
    if (status.tasks.length > 0) {
      const task = status.tasks[0]
      expect(task).toHaveProperty('name')
      expect(task).toHaveProperty('interval')
      expect(task).toHaveProperty('isRunning')
    }
  })
})