/**
 * @jest-environment node
 */
jest.mock('@/lib/services/financial/financial-service', () => ({
  koreaInvestmentService: {
    getMarketOverview: jest.fn(),
  },
}))

jest.mock('@/lib/services/crypto/crypto-service', () => ({
  upbitService: {
    getAllTickers: jest.fn(),
  },
}))

jest.mock('@/lib/services/market/market-service', () => ({
  marketService: {
    getAllExchangeRates: jest.fn(),
    getGlobalIndices: jest.fn(),
  },
}))

jest.mock('@/lib/services/cache/cache-service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  },
  CacheKeys: {
    financialDashboard: () => 'fin:dashboard',
  },
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    cryptoTicker: {
      findFirst: jest.fn(),
    },
  },
}))

import { GET } from '@/app/api/financial/dashboard/route'
import { koreaInvestmentService } from '@/lib/services/financial/financial-service'
import { upbitService } from '@/lib/services/crypto/crypto-service'
import { marketService } from '@/lib/services/market/market-service'
import { cacheService } from '@/lib/services/cache/cache-service'
import { prisma } from '@/lib/db'

const mockGetMarketOverview = jest.mocked(koreaInvestmentService.getMarketOverview)
const mockGetAllTickers = jest.mocked(upbitService.getAllTickers)
const mockGetAllExchangeRates = jest.mocked(marketService.getAllExchangeRates)
const mockGetGlobalIndices = jest.mocked(marketService.getGlobalIndices)
const mockCacheGet = jest.mocked(cacheService.get)
const mockCacheSet = jest.mocked(cacheService.set)
const mockFindFirst = jest.mocked(prisma.cryptoTicker.findFirst)

beforeEach(() => {
  jest.clearAllMocks()
  mockCacheGet.mockResolvedValue(null)

  mockGetMarketOverview.mockResolvedValue({
    kospi: { value: 2600, change: 10, changeRate: 0.38 },
    kosdaq: { value: 830, change: -5, changeRate: -0.6 },
    simulated: true,
  })

  mockGetAllTickers.mockResolvedValue([])
  mockGetAllExchangeRates.mockResolvedValue([])
  mockGetGlobalIndices.mockResolvedValue([])
  mockFindFirst.mockResolvedValue(null)
})

describe('/api/financial/dashboard', () => {
  it('returns cached data when available', async () => {
    const cachedData = {
      kospi: { value: 2500, change: 0, changeRate: 0 },
      cached: true,
    }
    mockCacheGet.mockResolvedValue(cachedData)

    const response = await GET()
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(cachedData)
    // Should not call external services
    expect(mockGetMarketOverview).not.toHaveBeenCalled()
  })

  it('fetches and returns fresh dashboard data', async () => {
    mockFindFirst
      .mockResolvedValueOnce({
        tradePrice: 65000,
        signedChangePrice: 500,
        signedChangeRate: 0.0077,
      } as never)
      .mockResolvedValueOnce(null)

    const response = await GET()
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data.kospi.value).toBe(2600)
    expect(body.data.kosdaq.value).toBe(830)
    expect(body.data.simulated).toBe(true)
    expect(body.data.btc).toEqual({
      price: 65000,
      change: 500,
      changeRate: 0.0077,
    })
    expect(body.data.eth).toBeNull()
    expect(mockCacheSet).toHaveBeenCalled()
  })

  it('returns 200 with fallback data when all services fail', async () => {
    // Each service has its own .catch() returning fallback values,
    // so even when all external APIs fail the route returns 200 gracefully.
    mockGetMarketOverview.mockRejectedValue(new Error('Network error'))
    mockGetAllTickers.mockRejectedValue(new Error('Network error'))
    mockGetAllExchangeRates.mockRejectedValue(new Error('Network error'))
    mockGetGlobalIndices.mockRejectedValue(new Error('Network error'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.kospi.value).toBe(0) // fallback from .catch()
    expect(body.data.btc).toBeNull()
    expect(body.data.eth).toBeNull()
    expect(body.data.usdKrw).toBeNull()
    expect(body.data.nasdaq).toBeNull()
  })

  it('gracefully handles DB failures', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB connection refused'))

    const response = await GET()
    const body = await response.json()

    // Should still return 200 with null btc/eth
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.btc).toBeNull()
    expect(body.data.eth).toBeNull()
  })

  it('includes USD/KRW and NASDAQ when available', async () => {
    mockGetAllExchangeRates.mockResolvedValue([
      { baseCurrency: 'USD', rate: 1380 } as never,
    ])
    mockGetGlobalIndices.mockResolvedValue([
      { symbol: '^IXIC', value: 17000, change: 50, changeRate: 0.3 } as never,
    ])

    const response = await GET()
    const body = await response.json()

    expect(body.data.usdKrw).toEqual({ baseCurrency: 'USD', rate: 1380 })
    expect(body.data.nasdaq).toEqual({ symbol: '^IXIC', value: 17000, change: 50, changeRate: 0.3 })
  })

  it('sets 60s cache TTL', async () => {
    await GET()

    expect(mockCacheSet).toHaveBeenCalledWith(
      'fin:dashboard',
      expect.any(Object),
      { ttl: 60 }
    )
  })
})
